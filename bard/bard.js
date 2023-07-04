import { Application, UI_Base } from '../core.js'

class BARD_APP extends Application {
}

const app = window._app = new BARD_APP()

///////////////////////////////////////////////////// OUTPUT UI
class UI_Output extends UI_Base {
	constructor() {
		super()
		this.css('ui-output-item')._(
			_('div').css('ui-query')._(
				_('img').css('ui-avatar').attr({src:'/favicon.ico'}),
				this._prompt = _('div') // text ? text : out.query
			),
			this._answer = _('div').css('ui-answer')._(
				_('i')._('please wait, thinking ...')
			)
		)
		this._data = null
		this._pick = null
	}
	
	on_choice_click = e => {
		var i = e.target.dataset.choice
		if (i !== undefined)
			this._update(this._data, parseInt(i))
	}
	
	_send = text => {
		this._prompt.clear()._(text)
		
		app.api({command:'prompt', text})
			.then(res => {
				var out = res?.data
				this._update(out)
			})
			.finally(() => this.fire('answer'))
	}
	
	_update = (out, choice) => {		
		this._data = out
		
		this._prompt.clear()
		this._answer.clear()
		
		var box = this._answer
		
		if (out) {

			// prompt
			this._prompt._(out.query)

			// answer
			var content = null, sources = null, html = null
			if ((choice === undefined) && (out.content)) {
				var {content, sources, html} = out
			} else if (out.choices) {
				this._pick = choice = choice || 0
				var res = out.choices[this._pick]
				var {content, sources, html}  = res
			}
			
			
			
			if (out.choices) {
				box._(
					_('div').css('ui-draft-list')._(
						... out.choices.map((e,i) => _('div').data({command:'choice', choice:i, pick:(choice === i) ? 1: 0 })._(e.content).on('click',this))
					)
				)
				// box._drafts = out.choices
			}

			// content
			if (html)
				box._(_('div').HTML(html) )
			else if (content)
				box._(_('pre')._(content))

			// sources
			if (sources)
				box._(
					_('div').css('ui-sources')._(
						_('div').css('ui-label')._('Sources'),
						... sources.map( s => _('a').attr({href:s.url, target:'_blank'})._(s.url) )
					)
				)
				
			// related
			if (out.related)
				box._(
					_('div').css('ui-related')._(
						_('div').css('ui-label')._('Related'),
						... out.related.map( s => _('div')._(s.text).data({command:'query', text:s.text}).on('click', this)) 
					)
				)
		} 
		/**
		else if (old_box) 
			box.css({color:'red'})._('failed')

		if (old_box)
			if (box === this._last) box.scrollIntoView({behavior:'smooth'})
		**/
	}
}

///////////////////////////////////////////////////// MAIN UI
class UI_Main extends UI_Base {
	constructor() {
		super()
		
		this.css('ui-main','flex-col')
		
		this._counter = 0
		this._last = null
		this.on('answer', this)
		
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

				// query (unanswered)
				var query = res?.data?.query
				if (query) 
					for (var t of query) this._query(t)
				
				// cache (answered)
				var cache = res?.data?.cache
				if (cache) 
					for (var t of cache)  this._push(t)

			})
			
		)
	}

	_add_index = text => {	
		var index = (this._counter += 1)
		this._index._(_('div').css('ui-query-item').data({command:'index', index})._(text).on('click', this))
		return index
	}

	_push = out => {			
		// index 
		var index = this._add_index(out.query)

		// answer 
		var box = this._last = _('div', {is: 'ui-output'})
		box.data({index})._update(out)
		
		this._output._(box)
	}

	_query = text => {
		var text = text.trim()
		if (!text) return

		// index
		var index = this._add_index(text)
		
		// answer
		var box = this._last = _('div', {is: 'ui-output'})
		box.data({index})._send(text)
		
		this._output._(box)
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
			var node = this._output.querySelector(`.ui-output-item[data-index="${index}"]`)
			if (node) node.scrollIntoView({behavior:'smooth'})
		}
	}
	on_quit_click = e => {
		this.run( app.api({command: 'quit'}).finally(() => this.animate_close()) )
	}
}


window.on('load', e => {
	
	var query = app.get_param()

	customElements.define('ui-main',		UI_Main, 			{extends:'div'} )
	customElements.define('ui-output',		UI_Output, 			{extends:'div'} )

	var main_ui = app.main_ui = _('div', {is:'ui-main'})
	
	window.document.body._( main_ui )
	
}, {once: true})
