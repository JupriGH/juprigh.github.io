console.log('BOUNCER')

import { app } from '../app.js?'

window.addEventListener('load', e => {

	var query = new URLSearchParams(window.location.search)
	var redir = query.get('redir')
	
	if (redir) {
		
		// START FLOW
		//console.log('REDIR')

		window.addEventListener('message', e => {
			
			//console.log('AUTH_ON_MESSAGE', e)
			//alert(e.data.server)
			
			app.api({command:'auth-url', type:e.data.type}, `${e.data.server}/api`).then(res => {
				//alert(res.data)
				window.location.href = res.data
			})
			.catch(e => {
				
				window.opener.postMessage({type:'auth-fail'}, '*')
				window.close()
			})
		})
		
	} else {
		
		//console.log('DONE')
		var done = Object.fromEntries(query.entries())
		window.opener.postMessage({type:'auth-done', done}, '*')
		window.close()
	}
	
}, {once: true})
