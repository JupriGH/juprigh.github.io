/**
import { app } from '../app.js'

window.on('load', e => {

	var query = app.get_param()
	//alert(JSON.stringify(query))
	
	if (window.opener) {
		
		// popup page
		if (query.redir) {
			// START FLOW
			var server = `${query.param?.server||''}/api`
			//alert(server)
				
			app.api({command:'auth-url', type: query.redir}, server)
				.then(res =>  window.location.href = res.data)
				.catch(e => {			
					window.opener.postMessage({type:'auth-fail'}, '*')
					window.close()
				})
			
		} else if (query.auth_type) {
			
			// window.opener.postMessage({type:'auth-done', done: query}, '*')
			// window.close()
			app.api({command:'auth-done', data: query}).finally(() => window.close())	
		}
	
	} else {

		// normal page: reopen as popup
		window.open(window.location.pathname + (window.location.search||'?redir=google'), 'auth', 'popup')	
	}
}, {once: true})
**/