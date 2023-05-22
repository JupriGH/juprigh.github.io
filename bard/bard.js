import { Application, UI_Base } from '../core.js'

class BARD_APP extends Application {
}

const app = window._app = new BARD_APP()

///////////////////////////////////////////////////// MAIN UI
class UI_Main extends UI_Base {
	constructor() {
		super()
		
		this.css('ui-main','flex-col')._(
			this._output = _('div').css('ui-output', 'flex-col'),
			_('div').css('ui-prompt')._(
				_('input').css('ui-chatbox').attr({type:'text', placeholder:'Enter a prompt here'}).data({command:'chat'}).on('keyup', this)
			)
		)
		this._last = null
		
		app.api({command: 'config'}).then(res => {
			var query = res?.data?.query
			if (query) for (var q of query) this._query(q)
		})
	}
	
	_query = (text) => {
		var text = text.trim()
		if (text) {

			var box = undefined
			var answer = undefined
			
			this._output._( 
				_('div').css('ui-query')._(
					_('img').css('ui-avatar').attr({src:'/favicon.ico'}),
					text
				),
				box = this._last = _('div').css('ui-answer')._(_('i')._('thinking ...'))
			)
			
			box.scrollIntoView({behavior:'smooth'})
			
			app.api({command:'prompt', text}).then(res => answer = res?.data?.content)
			.finally( () => {
				
				box.clear()
				if (answer) box._(answer)
				else 		box.css({color:'red'})._('failed')
				
				if (box === this._last) box.scrollIntoView({behavior:'smooth'})			
			})
		}
	}
	
	on_chat_keyup = e => {
		if (e.keyCode === 13) { // ENTER
			var text = e.target.value
			e.target.value = ''
			
			if (text === '/quit')
				this.run(
					app.api({command: 'quit'}).finally(() => this.remove())
				)
			else
				this._query(text)
			
		}
	}
}


window.on('load', e => {
	
	var query = app.get_param()

	customElements.define( 'ui-main', 				UI_Main, 			{extends:'div'} )

	var main_ui = app.main_ui = _('div', {is:'ui-main'})
	
	window.document.body._( main_ui )
	
}, {once: true})
