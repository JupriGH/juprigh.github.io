import { Application, UI_Base } from '../core.js'

class BARD_APP extends Application {
}

const app = window._app = new BARD_APP()

///////////////////////////////////////////////////// MAIN UI
class UI_Output extends UI_Base {
	constructor() {
		super()
	}
}

///////////////////////////////////////////////////// MAIN UI
class UI_Main extends UI_Base {
	constructor() {
		super()
		
		this.css('ui-main','flex-col')
		
		this._counter = 0
		this._last = null
		this.run(
		
			app.api({command: 'config'})
			.catch( e => {				
				this.animate_close()
			})
			.then(res => {
				// INIT UI
				this._(
					_('div').css('ui-output-container', 'flex-row')._(
						this._output = _('div').css('ui-output', 'flex-col'),
						this._index = _('div').css('ui-query-list', 'flex-col')._(
							_('div').css('ui-save', 'sticky-t')._('Save and Quit').data({command:'quit'}).on('click', this)
						)
					),
					_('div').css('ui-prompt')._(
						_('input').css('ui-chatbox').attr({type:'text', placeholder:'Enter a prompt here. Type /quit to end conversation.'}).data({command:'chat'}).on('keyup', this),
					)
				)				

				// CONFIG
				var query = res?.data?.query
				if (query) for (var q of query) this._query(q)
					
				var cache = res?.data?.cache
				if (cache) {
					for (var out of cache) {
						var index = (this._counter += 1)					
						this._push(index, null, out, null)
					}
				}
			})
			
		)
	}

	_push = (index, text, out, old_box) => {
		
		var box = undefined
	
		if (old_box) {  // update
			
			box = old_box
			box.clear()
			
		} else { // wait (new) 
			
			this._index._(_('div').css('ui-query-item').data({command:'index', index})._(text ? text : out.query).on('click', this))

			this._output._(
				_('div').css('ui-query').data({index})._(
					_('img').css('ui-avatar').attr({src:'/favicon.ico'}),
					text ? text : out.query
				),
				box = this._last = _('div').css('ui-answer')._(_('i')._(out ? null : 'please wait, thinking ...'))
			)
		
			box.scrollIntoView({behavior:'smooth'})
		}
		
		if (out) {

			var content = null, sources = null

			if (out.content) {
				content = out.content
				sources = out.sources
			} else if (out.choices) {
				var res = out.choices[0]
				content = res.content
				sources = res.sources
			}
			
			/**
			if (out.content_html)
				box._(_('div').HTML(out.content_html) )
			else if (out.content)
				box._(_('pre')._(out.content))
			**/
			
			if (out.choices) {
				box._(
					_('div').css('ui-draft-list')._(
						... out.choices.map((e,i) => _('div').data({index:i})._(e.content))
					)
				)
				box._drafts = out.choices
			}
			
			if (content)
				box._(_('pre')._(content))
			
			if (sources)
				box._(
					_('div').css('ui-sources')._(
						_('div').css('ui-label')._('Sources'),
						... sources.map( s => _('a').attr({href:s.url, target:'_blank'})._(s.url) )
					)
				)

			if (out.related)
				box._(
					_('div').css('ui-related')._(
						_('div').css('ui-label')._('Related'),
						... out.related.map( s => _('div')._(s.text).data({command:'query', text:s.text}).on('click', this)) 
					)
				)
		} 
		else if (old_box) 
			box.css({color:'red'})._('failed')

		if (old_box)
			if (box === this._last) box.scrollIntoView({behavior:'smooth'})
			
		return box
	}

	_query = (text) => {
		
		var text = text.trim()
		if (!text) return

		var index = (this._counter += 1)		
		var box = this._last = this._push(index, text)
		var out = undefined		

		app.api({command:'prompt', text})
		.then(res => out = res?.data)
		.finally( () =>  this._push(index, text, out, box))	
	}
	
	on_chat_keyup = e => {
		if (e.keyCode === 13) { // ENTER
			var text = e.target.value
			e.target.value = ''
			
			if (text === '/quit')
				this.run( app.api({command: 'quit'}).finally(() => this.animate_close()) )
			else if (text)
				this._query(text)
			
		}
	}
	on_query_click = e => {
		var text = e.target.dataset.text
		if (text) this._query(text)
	}
	on_index_click = e => {
		var index = e.target.dataset.index
		if (index) {
			var node = this._output.querySelector(`[data-index="${index}"]`)
			if (node) node.scrollIntoView({behavior:'smooth'})
		}
	}
	on_quit_click = e => {
		this.run( app.api({command: 'quit'}).finally(() => this.animate_close()) )
	}
}


window.on('load', e => {
	
	var query = app.get_param()

	customElements.define( 'ui-main', 				UI_Main, 			{extends:'div'} )
	customElements.define( 'ui-answer', 			UI_Output, 			{extends:'div'} )

	var main_ui = app.main_ui = _('div', {is:'ui-main'})
	
	window.document.body._( main_ui )
	
}, {once: true})
