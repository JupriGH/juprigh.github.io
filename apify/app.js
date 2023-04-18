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
	
	set_data = (id, data, meta) => this.store('datasets').then(store => store.put({id, data, meta}))
	
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

	api(query, url) {
		if (!url) url = `${this.host}/api`
		console.log('<api> <<', query)
		
		return fetch(url, {
			method		: 'POST',
			cache		: 'no-cache',
			headers		: {'Content-Type': 'application/json'},
			credentials	: 'omit', //'include',
			body		: JSON.stringify(query) 
		})
		.then( res => res.json() )
		.then( res => {
            //app.alert_api( res )
			if (res.code === 0) {
				console.log('<api> >>', res)
				return res
			} else {
				console.error('<api> >>', res)
				return Promise.reject(res)
			}
		})
	},
	get_column(value) {
		if (value === null) 				return _('td').css('col-empty')._('null') 
		if (value === undefined) 			return _('td').css('col-empty')._('undefined')
		if (value.constructor === Boolean)	return _('td').css('col-bool')._(value)
		if (value.constructor === Number)	return _('td').css('col-number')._(value)
		if (value.constructor === Date)		return _('td').css('col-date')._(value.toLocaleString('en-GB'))
		if (value.constructor === Object)	return _('td').css('col-object')._(JSON.stringify(value))
		if (value.constructor === Array)	return _('td').css('col-array')._(JSON.stringify(value))
		if (value.constructor === String) {
			if (value.match(/^https?:\/\//))
				return _('td')._( _('a').attr({href:value,target:'_blank'})._(value) )
			else if (value.match(/^(\+\-)?[0-9.,]+$/))
				return _('td').css('col-number')._(value)
			else
				
				return _('td')._(value)
		}
		return _('td')._(value.toString())
	},
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
		var channel = new MessageChannel()
		channel.port1.onmessage = e => resolve(e.data)
		
		// transfer port
		app.cache_node.contentWindow.postMessage('INIT', '*', [channel.port2])
		// get
		channel.port1.postMessage({type:'get',id})
	}),
	
	cache_set: (data) => new Promise((resolve) => {
		var channel = new MessageChannel()
		channel.port1.onmessage = e => resolve(e.data)
		
		// transfer port
		app.cache_node.contentWindow.postMessage('INIT', '*', [channel.port2])
		// get
		channel.port1.postMessage({type:'set', data})
	}),
	
	////////////////////////////////////////////////// OAUTH
	auth_url		: './auth', 	// bouncer
	auth_resolve	: null, 	// callback
	auth_timer		: null, 	// detect popup closed

	auth_clear: () => {
		// cleanup
		if (app.auth_timer) {
			clearInterval(app.auth_timer)
			app.auth_timer = null
		}
		window.removeEventListener("message", app.auth_state) 
	},

	auth_state: (e) => {
		// receive window message
		console.log(e)

		switch (e.data.type) {
		case 'auth-state':

			window.removeEventListener("message", app.auth_state) 

			if (e.data.done) {
				// DONE
				console.log('DONE', e.data.done)
				//e.source.close() // close popup
				var resolve = app.auth_resolve
				app.auth_resolve = null
				resolve(e.data.done)
			} else {
				// send origin info
				e.source.postMessage({type:'auth-state'}, '*')
				window.addEventListener("message", app.auth_state)
			}
			break
		/** 
		case 'airtable_auth':
			console.log(e)
			e.source.close() // close popup
			resolve(e.data.code)
			break
		**/
		}
	},
	auth: (auth_type) => new Promise((resolve) => {
		
		app.auth_clear()
		app.auth_resolve = resolve
		
		window.addEventListener("message", app.auth_state)

		var w = 540, h = 640, l = (screen.width - w) / 2, t = (screen.height - h) / 2
		var popup = window.open( 
			`${app.auth_url}/?redir=${auth_type}`, 
			`authwindow`,
			`resizable=yes,width=${w},height=${h},top=${t},left=${l}`
		)

		// detect close
		app.auth_timer = setInterval( (ms) => {				
			if (popup.closed) {
				app.auth_clear()
				resolve()
			}
		}, 1000)
		return

		var url = 'http://127.0.0.1:5000/auth' // bouncer url

		switch(auth_type) {
		case 'airtable'	: {url = `${url}/airtable`} break
		case 'google'	: {url = `${url}/google`} break
		default: 
			resolve() 
			return
		}

		var interval
		var clean = () => {
			if (interval) clearInterval(interval)
			window.removeEventListener('message', on_message)
		}
		var on_message = e => {
			clean()
			switch (e.data.type) {
			case 'airtable_auth':
				console.log(e)
				e.source.close() // close popup
				resolve(e.data.code)
				break
			}
		}

		/////
		window.addEventListener("message", on_message)
		
		var popup = window.open( 
			`${url}?origin=${encodeURIComponent(window.location.href)}`, 
			`AirTable`,
			`resizable=yes,width=${w},height=${h},top=${t},left=${l}`
		)

		// detect close
		interval = setInterval( () => {				
			if (popup.closed) {
				clean()
				resolve()
			}
		}, 1000)
	})
}