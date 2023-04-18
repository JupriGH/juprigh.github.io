console.log('BOUNCER')

import { app } from '../app.js?'

window.addEventListener('load', e => {

	var query = new URLSearchParams(window.location.search)
	var redir = query.get('redir')
	
	if (redir) {
		// START FLOW
		console.log('REDIR')
		
		window.addEventListener('message', e => {
			console.log(e)
			
			switch(e.data.type) {
			case 'auth-state':
				
				console.log('RECV', e)
				//var SERVER = e.origin
				
				app.api({command:'auth-url', type:redir}, `${e.origin}/api`).then(res => {
					window.location.href = res.data
				})
				break
			}
		})
	
		window.opener.postMessage({type:'auth-state'}, '*')
	
	} else {
		console.log('DONE')
		var done = Object.fromEntries(query.entries())
		window.opener.postMessage({type:'auth-state', done}, '*')
		window.close()
	}
	
}, {once: true})
