import '../../core.js'
import { app } from '../app.js'

window.on('load', e => {
	
	window.on('message', e => {
		// INIT
		var port2 = e.ports[0]
		port2.onmessage = async (e) => {
			console.log('CHANNEL: FROM MAIN', e)
			switch(e.data.type) {
			case 'get':
				var rec = await app.db.get_data(e.data.id)
				console.log('RECORD', rec)
				port2.postMessage(rec)
				break
				
			case 'set':
				console.log('SET', e)
				break
			}
		}
	})
	
})