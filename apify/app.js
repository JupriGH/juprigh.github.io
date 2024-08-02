import { Application } from '../core.js'

/////////////////////////////
export class DBClient {
	name 		= 'apify_dm' 
	version 	= 1
	store_list 	= ['metainfo', 'datasets']
	upgrade 	= db => this.store_list.map(s => db.objectStoreNames.contains(s) || db.createObjectStore(s))
	
	open = () =>  new Promise((resolve, reject) => indexedDB.open(this.name, this.version)
		.on('upgradeneeded', e => this.upgrade(e.target.result))
		.on('success', e => resolve(e.target.result)) // DB
		.on('error', reject)
	)
	
	get_store = (...name) => this.open().then(db => db.transaction([...name], 'readwrite').objectStore(name[0]))
	
	get_item = (sname, id) => 
		this.get_store(sname).then(store => 
			new Promise((resolve) => store.get(id).on('success', e => resolve(e.target.result)))
		)
	
	get_meta = (id) 		=> this.get_item('metainfo', id)
	get_data = (id) 		=> this.get_item('datasets', id)
	set_meta = (id, data) 	=> this.get_store('metainfo').then(store => store.put(data, id))
	set_data = (id, data) 	=> this.get_store('datasets').then(store => store.put(data, id))
	
	// INSIDE IFRAME
	listen() {
		//window.on('load', e => {

			console.warn('[CACHE] location:', window.location.href)
			
			window.on('message', e => {

				if (e.data == 'INIT') { // START SESSION
				
					console.warn('[CACHE] <session>')

					e.ports[0].onmessage = async (e) => {
						
						var t = e.target, r = e.data // request
						
						console.warn('[CACHE] message:', r.command)
						
						switch(r.command) {
						
						case 'get-meta':
							t.postMessage(await this.get_meta(r.id))
							break
							
						case 'get-data':
							t.postMessage(await this.get_data(r.id))
							break
						
						case 'set-meta':
							var {id, data} = r
							if (id && data) await this.set_meta(id, data)
							t.postMessage('OK') // some confirmation	
							break
						
						case 'set-data':
							var {id, data} = r
							if (id && data) await this.set_data(id, data)
							t.postMessage('OK') // some confirmation	
							break
						
						default:
							console.error('[CACHE] UNKNOWN_COMMAND', r.command)
							break
						}
					}
				}
			})
			
		//})
	}
}

///////////////////////////////
export const gunzip = async blob => { // DeCompressBlob
	//console.log('DeCompressBlob', blob)
	const ds = new DecompressionStream("gzip")
	const stream = blob.stream().pipeThrough(ds)
	return await new Response(stream).blob().then(res => res.text())
}

// TODO: how to disable fetch auto-decompress (get raw bytes)
// workaround: get uncompressed, then compress again!

const stream_progress = (stream, progress) => 
	progress 
	? new ReadableStream({	
		async start(controller) {

			var reader = stream.getReader(), count = 0

			while (1) {
				progress({count})

				var {done, value} = await reader.read()
				if (done) break

				// progress			
				count += value.byteLength			
				controller.enqueue(value)
			}
			
			progress()
			controller.close()
		}
	}) 
	: (console.warn('[stream_progress] PROGRESS_CALLBACK_UNDEFINED'), stream)

export const fetch_gzip = async ({url, compress, progress}) => { 
	/** 
		compress: 'gzip'
		progress: function callback({count, total})
	*/
	var response = await fetch(url)
	if (response.status !== 200) throw `HTTP Error ${response.status}`
	
	if (compress || progress) {
		var stream = response.body
		if (progress) stream = stream_progress(stream, progress)
		if (compress) stream = stream.pipeThrough(new CompressionStream(compress))
		response = new Response(stream)
	}
	return response
}

///////////////////////////////

class DM_App extends Application {
	
	actors	= {}
	
	////////////////////////////////////////////////// CACHE
	// https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel
	// https://advancedweb.hu/how-to-use-async-await-with-postmessage/
		
	cache_node = null // iframe	
	cache_init = () =>  new Promise((resolve) => {
		window.document.body._( 
			_('iframe').css({display:'none'}).attr({src:'?mode=cache'}).on('load', e => resolve(this.cache_node = e.target)) 
		)
	})
	cache = query => new Promise((resolve, reject) => { // {command, key, data}
		var {port1, port2} = new MessageChannel()
		this.cache_node.contentWindow.postMessage('INIT', '*', [port2])
		port1.onmessage = e => resolve(e.data)
		port1.postMessage(query)
	})

	////////////////////////////////////////////////// OAUTH

	//auth_url		: './auth',	// bouncer url
	auth_resolve	= null 	// callback
	auth_timer		= null 	// detect popup closed

	auth_clear = () => {
		// cleanup
		if (this.auth_timer) {
			clearInterval(this.auth_timer)
			this.auth_timer = null
		}
		window.removeEventListener('message', this.auth_state) 
	}
	
	auth_listen = e => {
		
		console.log('AUTH_LISTEN', e)
		
		switch(e?.data?.type) {
		/**
		case 'dm-auth-fail':
			
			app.auth_clear()
			//console.log('AUTH FAILED')
			app.api({command:'auth-done', data:{'error':'FAILED'}}).then( _ => app.auth_reject('Authentication Failed!'))			
			//app.main_ui.confirm({message:'Authentication Failed!', type:'error'}).then(() => app.auth_reject(e))
			break
		**/
		case 'dm-auth-done':
		
			this.auth_clear()
			var done = e?.data?.done
			if (done)
				this.api({command:'auth-done', ...done}).then(res => this.auth_resolve(res)).catch(e => this.auth_reject(e))
			else
				this.api({command:'auth-done', data:{'error':'NO_DATA'}}).then( _ => this.auth_reject('No Data!'))
			break
		}
	}
	
	auth = auth_type => {

		return new Promise((resolve, reject) => {

			// SETUP
			this.auth_clear()
			this.auth_resolve = resolve
			this.auth_reject  = reject
			
			window.on('message', this.auth_listen) //, {once:true})

			// WINDOW
			var w = 540, h = 640, l = (screen.width - w) / 2, t = (screen.height - h) / 2
			var p = Object.entries({'location':'no','popup':'yes','resizable':'yes','width':w, 'height': h, 'top': t, 'left':l}).map(x => `${x[0]}=${x[1]}`).join(',') 
			// var u = `?mode=auth&redir=${auth_type}` + (this.param ? `&param=${this.param}` : '')
			var u = `?mode=auth&redir=${auth_type}&token=${this.__query?.token}`
			var popup = window.open(u, `authwindow`, p)
			
			// DETECT CLOSED
			this.auth_timer = setInterval(() => {
				if (popup.closed) {
					//app.auth_clear()
					//reject('Authentication Cancelled!')
					window.postMessage({type:'dm-auth-done', done:{'auth_type':auth_type, 'error': 'CLOSED', 'error_description': 'Cancelled.'}})
					this.auth_clear()
				}
			}, 500)
		})
	}
	
	auth_start = () => {
		var query = this.__query
		if (window.opener) {
			// This is popup
			
			if (query.redir) {
				// START AUTH FLOW
				var server = `${query.param?.server||''}/api`
				//server = 'http://127.0.0.1:8008/api'
				//alert(`${1} ${server}`)
				
				this.api({command:'auth-url', auth_type: query.redir}, server)
					.then(res => { alert(res.data),window.location.href = res.data })
					.catch(e => {			
						//alert('FAILED #1')
						window.opener.postMessage({type:'dm-auth-done', done: {'error': 'GET_URL_FAILED'}}, '*')
						window.close()
					})
				
			} else if (query.auth_type) {
				//alert('DONE #1')
				window.opener.postMessage({type:'dm-auth-done', done: query}, '*')
				window.close()
				//app.api({command:'auth-done', data: query}).finally(() => alert( 'window.close()' ))	
			}
			
		} else {
			
			//window.open(window.location.pathname + (window.location.search||'?redir=google'), 'auth', 'popup')
			//window.open(window.location.href, 'auth', 'popup')
			//app.auth()
			//alert(query.redir)
			
			if (query.redir) {				
				customElements.define('ui-auth',  UI_Auth, {extends:'div'})
				window.document.body._(_('div', {is: 'ui-auth'}))
				this.auth(query.redir)
			}
		}	
	}

}

export const app = window._app = new DM_App()
/**
export const xapp = {

	sse(query, url, progress) {
		
		return new Promise((resolve, reject) => {
	
			if (!url) url = `${this.host||window.location.origin}/sse`
			
			url = new URL(url)
			url.searchParams.append('params', btoa(JSON.stringify(query)))
			
			console.log('<sse> <<', query)
			
			var raw = undefined
			var src = new EventSource(url.href)
			
			// CONNECTED
			src.on('open', 		e => console.warn('sss:open', e))
			
			// MESSAGE
			src.on('message', 	e => console.warn('sse:message', e))
			
			// RESULT
			src.on('end', e => {
				console.warn('sse:end', e)
				e.target.close()
				resolve([JSON.parse(e.data), raw])
			})
			
			// ERROR
			src.on('error', 	e => {
				console.warn('sse:error', e)
				e.target.close()
				reject('CLOSED')
			})
		})
		.then(tmp => {
			var [res, raw] = tmp

			if (res.code === 0) {
				console.log('<sse> >>', res)
				return res
			} else {
				console.error('<sse> >>', res)
				return Promise.reject(res)
			}
		})
	},
}
**/

////////////////////////////////////// BOOT
import { start_ui, UI_Auth } from './main.js'


window.on('load', e => {
	alert(app.__query?.mode)
	
	switch (app.__query?.mode) {
	case 'manager':
		start_ui()
		break
		
	case 'cache':
		new DBClient().listen()
		break
	
	case 'auth':
		app.auth_start()
		break		
	}
}, {once: true} )