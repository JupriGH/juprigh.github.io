import '../core.js'
import { app } from './app.js?'

const 	LIST_ACTORS   = '__ACTORS__',
		LIST_DATASETS = '__DATASETS__',
		LIST_KEYVALUE = '__KEYVALUE__'

const	PER_PAGE = 10

const DecompressB64 = async data => {
	var arr = new Uint8Array(atob(data).split('').map(e => e.charCodeAt(0)))
	var blob = new Blob([arr.buffer])
	return DecompressBlob(blob)
}
const DecompressBlob = async blob => {
	const ds = new DecompressionStream("gzip")
	const stream = blob.stream().pipeThrough(ds)
	return await new Response(stream).blob().then(res => res.text())
}
////////////////////////////////////// BASE INTERFACE
class UI_Base extends HTMLDivElement {
	constructor() {
		super()
	}

	button = (command, caption) => _('button').attr({type:'button'}).data({command}).on('click', this)._(caption)
	
	run(promise, element) {
		(element||this).dataset.running = 1
		promise.finally(() => delete (element||this).dataset.running)
	}
	handleEvent(e, ... args) {		
		var command = e.currentTarget.dataset.command ?? e.target.dataset.command

		command = command ? `on_${command}_${e.type}` : `on_${e.type}`
		command = command.replace('-','_')

		if (this[command]) this[command](e, ... args)
		else
			console.warn('event:', command, ... args)
	}
}
////////////////////////////////////////////////////////// EDITOR
class UI_ListEditor extends UI_Base {
    constructor() {
        super()

		this._(
			this._table = _('table'),
			_('div')._(
				this.button('clone', 'ADD'),
				this.button('clear','CLEAR')
			)
		)
	}
	set_editor(name, conf) {
		this._name = name  
		this._conf = conf

		this._table.clear()
		this.add_editor(...conf.prefill)
		return this
	}

	add_editor(...values) {

		var is_string = this._conf.editor === 'stringList'

		if (values.length === 0) values = [is_string ? '' : {}]

		var name = this._name
		this._table._(
			... values.map(e =>
				_('tr')._(
					_('td')._(
						is_string 
						? _('input').attr({name, type:'text', value:e})
						: [
							_('input').attr({name, type:'text', value: e.key||''}),
							_('input').attr({type:'text', value: e.value||''})
						],
						this.button('delete','❌')
					)
				)
			)
		)
	}
	
	get_values() {
		var is_string = this._conf.editor === 'stringList'
		var res = []
		
		if (is_string) {
			for (var row of this._table.childNodes) {
				var val = row.childNodes[0].childNodes[0].value
				val = val.trim()
				if (val) res.push(val)
			}
		} else {
			for (var row of this._table.childNodes) {
				var key = row.childNodes[0].childNodes[0]
				var val = key.nextSibling
				key = key.value.trim()
				val = val.value.trim()
				if (key && val) res.push({key, value:val})
			}
		}
		return res
	}

	on_clone_click(e) {
		this.add_editor()
	}
	on_delete_click(e) {
		e.currentTarget.parentNode.parentNode.remove()
	}
	on_clear_click(e) {
		this._table.clear()
		this.add_editor()
	}
}

///////////////////////////////////////////////// ACTOR
class UI_Actor extends UI_Base {
    constructor() {
        super()
		
		this._input_schema = null
		this._(
			_('div'),
			_('div')._(
				_('button').data({command:'run'})._('start').on('click',this),				
				this._input_table = _('table')
			)
		)
		this.refresh_input_ui()
    }
	
	on_open_click(e) {
		var d = e.currentTarget.dataset
		d.hide = (d.hide == '1' ? '0' : '1')  
	}

	on_run_click(e) {
		var args = {}

		for (var [name,conf] of Object.entries(this._input_schema.properties)) {

			var {type, __editor} = conf

			switch (type) {
			case 'boolean':
				if (__editor.checked) args[name] = true
				break

			default:
				if (type === 'proxy')
					{}
				else if (type === 'array')
					args[name] = __editor.get_values()
				else {
					var value = __editor.value
					if (!value) break
					if (type === 'integer') value = parseInt(value)
					args[name] = value
				}
				break 
			}
		}

		console.log(args)
		app.api({command:'fetch', arguments:args})
	}
	tooltip(html) {
		var desc = _('div').css('ui-tooltip-content')
		desc.innerHTML = html
		return _('span')._('📝', desc).css('ui-tooltip-icon')
	}

	refresh_input_ui() {
		var tab = this._input_table,
			section = _('tbody')
		
		tab.clear()._( _('thead'), section )

		app.api({command:'config'}).then( res => {

			this._input_schema = res.data.input

			for (var [name, p] of Object.entries(res.data.input.properties)) {
				
				var edi = undefined, cap = undefined, tem = undefined // editor, caption
								
				switch(p.type) {
				case 'boolean':
					var id = `__${name}`
					cap = _('label').attr({for:id})._(p.title)
					edi = _('input').attr({id, name, type:'checkbox'}).attr(p.default?{checked:''}:null)
					break
				
				case 'array':

					edi = _('div', {is:'ui-list-editor'}).set_editor(name, p)
					break

				default: 
					// select
					if (p.enum) {
						edi = _('select').attr({name})._(
							... p.enum.map((e,i) => 
									_('option')
										.attr({value:e})
										.attr((p.default === e) ? {selected:''} : null)
										._(p.enumTitles[i])
								)
						)
						break
					}
					
					// string / number
					if (p.editor === 'textarea') {
						edi = _('textarea').attr({name})._(p.prefill)
					} else {
						var type = p.isSecret ? 'password' 
							: (p.editor === 'datepicker') ? 'date' 
							: (p.type === 'integer') ? 'number' : 'text'
						edi = _('input').attr({name, type, value:p.prefill ?? ''})
					}
					edi.attr(p.default ? {placeholder:p.default} : null)
				}

				// section
				if (p.sectionCaption) {
					tab._(
						_('thead').css('ui-section-head')._(
							_('tr')._(
								_('th').attr({colspan:3}).css('ui-section-caption')._(p.sectionCaption)
							)
						).data({command:'open',hide:1}).on('click', this),
						section = _('tbody').css('ui-section-body')
					)
				}
				// group
				if (p.groupCaption) {
					var col = _('td').css('ui-group-caption').attr({colspan:3})._(p.groupCaption)
					if (p.groupDescription) col.push( this.tooltip(p.groupDescription) )
					section._( _('tr')._(col) )
				}

				// description 
				var des = _('td')
				if (p.description) des.push( this.tooltip(p.description) )

				// ROW
				if (!cap && p.title) cap = p.title
				if (cap) cap = _('td').css('ui-input-caption')._(cap)

				var col = _('td')._(edi)
				section._( _('tr')._( cap,  des, col ) )
				p.__editor = edi
			}
		})

	}
}
///////////////////////////////////////////// STORAGE
class UI_Storage extends UI_Base { // storage list
	constructor() {
		super()
		this.css('ui-storage','flex-col')._(
			_('div')._(
				this.button('refresh','REFRESH'),
				this.button('data-ds','DATASET'),
				this.button('data-kv','KEY-VALUE')
			),
			_('table').css('ui-table')._(
				_('thead').css('sticky-t')._(
					_('tr')._(['#', 'ID', 'Name', 'Items', 'Created','Modified','Size','', 'Actor'].map(e => _('th')._(e)))),
				this._list = _('tbody').data({command:'cell'}).on('click', this)
			)
		)
		
		
		this._data_ds = null
		this._data_kv = null

		this.on('dataset-open', this, true)
		this.set_type(0)
	}

	set_type = type => { 		
		this._type = type
		
		if ((type === 0 && !this._data_ds) || (type !== 0 && !this._data_kv)) {
			this.run(
				
				app.api({command:'storage-list', type}).then( res => {
					
					console.log('UPDATE STORAGE LIST')
					// actors
					
					var actors = res?.data?.actors
					if (actors) app.cache_set({id:LIST_ACTORS, data:{actors}})
					
					// stores
					var stores = res?.data?.stores
					if (type === 0) app.cache_set({id:LIST_DATASETS, data:{stores}})
					else  			app.cache_set({id:LIST_KEYVALUE, data:{stores}})
					
					
					return [actors, stores]
				})
				.catch(e => {
					// ERROR / OFFLINE
					console.log('ERROR OFFLINE?')
					var prom
					if (type === 0) prom = app.cache_get(LIST_DATASETS).then(res => res?.data?.stores)
					else 			prom = app.cache_get(LIST_KEYVALUE).then(res => res?.data?.stores)
					
					return Promise.all([app.cache_get(LIST_ACTORS).then(res => res?.data?.actors), prom])
				})
				.then(res => { // [actors, stores]
					var [actors, stores] = res
					if (actors)  Object.assign(app.actors, actors)
					if (stores) {
						if (type === 0) this._data_ds = stores
						else 			this._data_kv = stores
					}
					
					this.refresh_view() 
				})
			)
		} else {
			this.refresh_view()
		}
		return this
	}
	refresh_view() {
		var data = ((this._type||0) === 0) ? this._data_ds : this._data_kv
		var no = 0
		this._list.clear()._( ... data.map(e => {
			var actor = app.actors[e.actId]

			return _('tr').data({id:e.id, type:this._type})._(
					_('th')._(++no),
					_('td')._(e.id),
					_('td')._(e.name),
					_('td')._(e.itemCount),
					_('td')._(e.createdAt),
					_('td')._(e.modifiedAt),
					_('td')._(e.stats?.s3StorageBytes),
					_('td')._(
						(actor?.pictureUrl) ? _('img').css('actor-icon').attr({src: actor?.pictureUrl}) : null
					),
					_('td')._(actor?.title??null)
			)
		}))
		return this
	}
	on_data_ds_click = e => this.set_type(0)
	on_data_kv_click = e => this.set_type(1)
	on_refresh_click  = e => this.refresh_view()
	/** 
	on_dataset_open 	= e => {
		// this._( _('div', {is:'ui-dataset'})._load(e.detail.id) )
		app.api({command:'storages', name:e.detail.id, type:this._type})
	}
	*/	
	on_cell_click(e) {
		var o = e.target 
		if (o.tagName.toUpperCase() == 'TD' && o.cellIndex == 1) {
			var {id, type} = o.parentNode.dataset
			//this.fire('dataset-open', {id, type:parseInt(type||0)}, true)
			
			this._( _('div', {is:'ui-dataset'})._load(id, type) )
		}
	}
	
}
///
class UI_Dataset extends UI_Base {
	
	constructor() {
		super()
		
		this.css('ui-modal','flex-col')._(
			_('div').css('flex-col')._(
				_('table').css('ui-table', {'flex-grow':1})._(
					this._head = _('thead').css('sticky-t'),
					this._list = _('tbody')
				),
				this._page = _('div').css('page-list').data({command:'page'}).on('click', this),
				_('div').css('button-list')._(this.button('close', 'CLOSE').on('click', this))
			)
		)

		// data
		this._page_item = null // selected
		this._head_list = []		
		this._data = []
	}
	
	on_close_click = e => this.remove()
	on_page_click = e => this.page_view(parseInt(e.target.dataset.page||0), e.target)
	
	get_column(value) {
		if (value === null) 				return _('td')._('null') 
		if (value === undefined) 			return _('td')._('undefined')
		return _('td')._(value.toString())
	}
	
	page_view = (index, node) => {
		var data = this._data, head = this._head_list
		
		data = data.slice(index, index+PER_PAGE)
		this._list.clear()._(
			... data.map(e => _('tr')._(
				_('th').css('row-index','sticky-l')._(++ index),
				... head.map(n => this.get_column(e[n]))
			))
		)
		//
		if (node) {
			if (this._page_item) delete this._page_item.dataset.selected
			this._page_item = node.data({selected:1})
		}
	}
	
	_load = (name, type) => {
		var meta = null // OFFLINE

		this.run(
			app.api({command:'storage-list', name})
				.then(res => meta = res.data)
				.catch(e => {
					console.log('GET META: ERROR/OFFLINE')
				})
				.then(e => {
					return app.cache_get(name).then(res => {
						if (res) {
							console.log('CACHED')
							
							if (meta) {
								console.log('CHECK DATE')
							}
							
							return res.data
						}

						if (meta) {
							// GET DATA
							return app.api({command:'storage-data', name, type:parseInt(type||0)})
								.catch(e => {
									console.log('GET DATA: ERROR/OFFLINE')
									return res.data // OFFLINE DATA
								})
								.then(res => {
									if (res.raw) {
										app.cache_set({id:name, data:res.raw, meta})
										return res.raw
									}
								})
						}
					})
				})
				
				.then(raw => raw ? DecompressB64(raw).then(raw => JSON.parse(raw)) : null)
				.then(data => {
					// RESET
					this._data = []
					this._page_item = null
					this._head_list.length = 0
					this._page.clear()
					this._head.clear()
					this._list.clear()
					
					if (data) {
						
						var head = this._head_list

						// head
						for (var e of data)
							for (var k of Object.keys(e))
								if (!head.includes(k)) head.push(k)

						this._head._( _('th').css('sticky-l')._('#'), ... head.map(n => _('th')._(n) ) )

						// list						
						for (var p = 0; p <= data.length; p += PER_PAGE) {
							this._page._(_('span').css('page-item').data({page:p})._(`${p+1}-${p+PER_PAGE}`))
						}
						this._data = data
						this.page_view(0)
					}
				})
			,

			this.parentNode
		)
		return this
	}
}
///////////////////////////////////////////// MAIN
class UI_Main extends UI_Base {
	
	constructor() {
		super()
		
		this.css('ui-main','flex-row')
		
		this.run(
			
			Promise.allSettled([
				
				app.cache_init(),
				app.api({command:'config'})
			
			]).then( res => {

				var [node, config] = res 
				
				this._(
					// MAIN CONTENT
					_('div').css('ui-main-content', 'flex-col')._(
						this._content = _('div') 
					), 
					// MAIN MENU
					_('div').css('ui-main-menu', 'flex-col')._(
						this.button('actor','ACTOR'),
						this.button('storage','STORAGE'),
						this.button('airtable','AIRTABLE'),
						this.button('google','GOOGLE'),
					)
				)
			
				// config
				if (config?.value) {
					/*
					var actors = res?.data?.actors
					if (actors) {
						app.actors = Object.fromEntries(actors.map(e => [e.id, e]))
					}
					*/
				}
			})
		)
	}

	set_content = content  => this._content.replaceWith( this._content = content )
	
	on_storage_click 	= e => this.set_content(_('div', {is:'ui-storage'}))
	//on_actor_click 		= e => app.cache_get('AONaNTUtji6ymussY').then(console.log)
	on_airtable_click 	= e => this.run(app.auth('airtable').then(res => console.log('CODE', res)))
	on_google_click 	= e => this.run(app.auth('google').then(res => console.log('CODE', res)))
}

////////////////////////////////////// BOOT

window.on('load', e => {
	
	var query = new URLSearchParams(window.location.search)
	var param = query.get('param')
	if (param) {
		param = JSON.parse(atob(param))
		console.log('PARAM', param)
		app.host = param.server
	}
		
	// app.host = localStorage.getItem('server')||''
	
	customElements.define( 'ui-list-editor', 	UI_ListEditor, 	{extends:'div'} )
	customElements.define( 'ui-actor', 			UI_Actor, 		{extends:'div'} )
	customElements.define( 'ui-storage',		UI_Storage,		{extends:'div'} )
	customElements.define( 'ui-dataset',		UI_Dataset, 	{extends:'div'} )
	customElements.define( 'ui-main', 			UI_Main, 		{extends:'div'} )
	
	// INIT UI
	window.document.body._( _('div', {is:'ui-main'}) )
	
}, {once: true} )