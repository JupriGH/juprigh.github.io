import { app } from '../app.js'

window.on('load', e => {

	var query = app.get_param()
	//alert(JSON.stringify(query))
	
	if (window.opener) {
		
		// popup page
		if (query.redir) {
			// START FLOW
			var url = `${query.param?.server||''}/api`
			//alert(url)
				
			app.api({command:'auth-url', type: query.redir}, url)
				.then(res => {
					window.location.href = res.data
				})
				.catch(e => {			
					window.opener.postMessage({type:'auth-fail'}, '*')
					window.close()
				})
			
		} else if (query.auth_type) {
			window.opener.postMessage({type:'auth-done', done: query}, '*')
			window.close()
		}
	
	} else {

		// normal page: reopen as popup
		window.open(window.location.href, 'auth', 'popup')	
	}
}, {once: true})
