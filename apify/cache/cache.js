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
				port2.postMessage(rec)
				break
				
			case 'set':
				console.log('SET', e)
				
				var {id, data, meta} = e.data
				if (id && data && meta) await app.db.set_data(id, data, meta)
				break
			}
		}
	})
	
})
