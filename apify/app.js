/////////////////////////////
class CMainDB {
	name 	= 'apify_dm' 
	version = 1
	upgrade = db => db.createObjectStore('datasets', {keyPath: "id"})
	
	open = () => 
		new Promise((resolve,reject) => {
			const req = indexedDB.open(this.name, this.version)
			if (this.upgrade) req.addEventListener('upgradeneeded', e => this.upgrade(e.target.result))
			req.addEventListener('error', reject)
			req.addEventListener('success', e => resolve(e.target.result)) // DB
		})
	
	store = (...name) => this.open().then(db => db.transaction([...name], "readwrite").objectStore(name[0]))
	
	set_data = (id, data) => this.store('datasets').then(store => store.put({id, data}))
	
	get_data = (id) => 
		this.store('datasets').then(store => new Promise((resolve) => {
			var req = store.get(id)
			req.addEventListener('success', e => resolve(e.target.result))
		}))
}
///////////////////////////////
export const app = window._app = {
	host	: '', //'https://1ehucfdghji5.runs.apify.net/api',
	actors	: {},
	db		: new CMainDB(),

	api(query, url, progress) {
		if (!url) url = `${this.host}/api`
		console.log('<api> <<', query)

		var prom = fetch(url, {
			method		: 'POST',
			cache		: 'no-cache',
			headers		: {'Content-Type': 'application/json'},
			credentials	: 'omit', //'include',
			body		: JSON.stringify(query) 
		})
		
		if (0) { // (progress) {
			prom = prom.then(res => 
				new Promise((resolve) => {
					var tmp = new Response(
						new ReadableStream({
							async start(controller) {
								var reader = res.body.getReader()
								var loaded = 0
								var total = res.headers.get('content-length')
								console.log('TOTAL', total)
								total = parseInt(total, 10)
								
								progress({caption:'downloading ... ', loaded:0, total:0})
								
								for (;;) {
									var {done, value} = await reader.read()
									//console.log('---', done, value)
									
									if (done) break

									loaded += value.byteLength
									try {
										progress({loaded, total})
									} catch (e) {
										console.error(e)
									}
									controller.enqueue(value)
								}
								//console.log('download completed')
								progress()
								controller.close()
								resolve(tmp)
							}
						})
					)
				})
			)
		}
		///
		return prom
			.then(res => {
				console.log('HEADERS', ... res.headers)
				
				var r = res.headers.get('x-api-response')
				if (r) {
					// header + content
					console.log('#1')
					return res.arrayBuffer().then(res => [JSON.parse(r), res])
				} else {
					console.log('#2')
					return res.json().then(res => [res]).catch(err => (console.error(err),[undefined]))
				}
			})
			.then(res => {
				console.log( 'RES', res )
				/**
				var [res, raw] = res
				
				if (raw) console.log('RAW', raw)

				if (res.code === 0) {
					console.log('<api> >>', res)
					return res
				} else {
					console.error('<api> >>', res)
					return Promise.reject(res)
				}
				**/
			})
	},
	
	get_column(value, format) {
		if (value === null) 				return _('td').css('col-empty')._('null') 
		if (value === undefined) 			return _('td').css('col-empty')._('undefined')
		if (value.constructor === Boolean)	return _('td').css('col-bool')._(value)
		if (value.constructor === Number)	return _('td').css('col-number')._(value)
		if (value.constructor === Date)		return _('td').css('col-date')._(value.toLocaleString('en-GB'))
		if (value.constructor === Object)	return _('td').css('col-object').data({view:1})._(JSON.stringify(value))
		if (value.constructor === Array)	return _('td').css('col-array') .data({view:1})._(JSON.stringify(value))
		if (value.constructor === String) {
			
			// format: link, image
			if (value.match(/^https?:\/\//))
				return _('td')._( _('a').attr({href:value,target:'_blank'})._(value) )
			else if (value.match(/^(\+\-)?[0-9.,]+$/))
				return _('td').css('col-number')._(value)
			else
				// STRING
				return _('td')._(value)
		
		}
		return _('td')._(value.toString())
	},
	
	animate_close : node => node.on('animationend', e => node.remove()) && node.css({'animation':'animate-zoom-out 0.5s'}),
	
	////////////////////////////////////////////////// CACHE
	// https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel
	// https://advancedweb.hu/how-to-use-async-await-with-postmessage/
		
	cache_node : null, // iframe
	cache_init : () =>  new Promise((resolve) => {
		window.document.body._( 
			_('iframe').css({display:'none'}).attr({src:'cache/'}).on('load', e => resolve(app.cache_node = e.target)) 
		)
	}),
	
	cache_get: (id) =>  new Promise((resolve) => {
		console.log('CACHE_GET', id)

		var channel = new MessageChannel()
		channel.port1.onmessage = e => resolve(e.data)
		
		// transfer port
		app.cache_node.contentWindow.postMessage('INIT', '*', [channel.port2])
		// get
		channel.port1.postMessage({type:'get',id})
	}),
	
	cache_set: (data) => new Promise((resolve) => {
		console.log('CACHE_SET', data.id)
	
		var channel = new MessageChannel()
		channel.port1.onmessage = e => resolve()
		
		// transfer port
		app.cache_node.contentWindow.postMessage('INIT', '*', [channel.port2])
		// get
		channel.port1.postMessage({type:'set', data})
	}),
	
	////////////////////////////////////////////////// OAUTH
	auth_url		: './auth',	// bouncer url
	auth_resolve	: null, 	// callback
	auth_timer		: null, 	// detect popup closed

	auth_clear: () => {
		// cleanup
		if (app.auth_timer) {
			clearInterval(app.auth_timer)
			app.auth_timer = null
		}
		window.removeEventListener('message', app.auth_state) 
	},
	
	auth_listen: e => {
		app.auth_clear()
		
		switch(e?.data?.type) {
		case 'auth-fail':
			//console.log('AUTH FAILED')
			app.main_ui.confirm({message:'Authentication Failed!', type:'error'}).then(() => app.auth_resolve())
			break
			
		case 'auth-done':
			app.auth_resolve(e?.data?.done)
			break
		}
	},
	
	auth: auth_type => new Promise((resolve) => {
		
		// SETUP
		app.auth_clear()
		app.auth_resolve = resolve
		
		window.addEventListener('message', app.auth_listen)
		
		// WINDOW
		var w = 540, h = 640, l = (screen.width - w) / 2, t = (screen.height - h) / 2
		var popup = window.open( 
			`${app.auth_url}/?redir=${auth_type}`,
			`authwindow`,
			`resizable=yes,width=${w},height=${h},top=${t},left=${l}`
		)
		
		// DETECT CLOSED
		app.auth_timer = setInterval( time => {
			if (popup.closed) {
				app.auth_clear()
				resolve()
			}
		}, 1000)
		
		popup.addEventListener('load', e => popup.postMessage({type:'AUTH_INIT', server:app.host, type:auth_type}, '*'))
	})
}