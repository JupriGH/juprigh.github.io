import { Application } from '../core.js'

class BARD_APP extends Application {
}

const app = window._app = new BARD_APP()


window.on('load', e => {
	
	var query = app.get_param()

}, {once: true})
