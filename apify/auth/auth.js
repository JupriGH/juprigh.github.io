import { app } from '../app.js'

if (window.opener) {
	
	// popup page
	window.on('load', e => {
		var query = app.get_param()
		//alert(JSON.stringify(query))
		
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
	}, {once: true})

} else {
	
	// normal page
	alert(document.referrer)
}