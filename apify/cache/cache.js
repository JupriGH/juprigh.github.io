import '../../core.js'
import { app } from '../app.js'


window.on('load', e => {
	
	console.log(`CACHE: ${window.location.href}`)
	
	window.on('message', e => {
		// INIT
		var port2 = e.ports[0]
		port2.onmessage = async (e) => {
			//console.log('CHANNEL: FROM MAIN', e)
			switch(e.data.type) {

			case 'get':
			
				var rec = await app.db.get_data(e.data.id)
				port2.postMessage(rec)
				break
				
			case 'set':
				
				var {id, data, meta} = e.data.data
				if (id && data) await app.db.set_data(id, data, meta)
				break
			}
		}
	})
	
})
