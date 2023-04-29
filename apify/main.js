import '../core.js'
import { app } from './app.js?'

const 	LIST_ACTORS   = '__ACTORS__',
		LIST_DATASETS = '__DATASETS__',
		LIST_KEYVALUE = '__KEYVALUE__'

const	PER_PAGE = 100

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
const deep_get = (node, path) => {

	if (node === undefined) return node
	if (node === null) return node
	
	for (var p of path) {
		if (node === undefined) return
		if (node === null) return
	
		if (node.constructor === Array) {
			if (!p.match(/^[0-9]$/)) return
			node = node[p]
			continue
		}
		else if (node.constructor === Object) {
			node = node[p]
			continue
		}
		return
	}
	return node
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
	
	confirm = ({message, type, content, buttons, element}) => new Promise((resolve) => {
		var modal = _('div', {is:'ui-confirm'})._open({message, type, content, buttons, callback:resolve})
		var res = (element||app.main_ui)._(modal)
		/// modal.showModal()
		return modal
	})

	handleEvent(e, ... args) {		
		var command = e.currentTarget.dataset.command ?? e.target.dataset.command

		command = command ? `on_${command}_${e.type}` : `on_${e.type}`
		command = command.replace('-','_')

		if (this[command]) this[command](e, ... args)
		else
			console.warn('event:', command, ... args)
	}
}

////////////////////////////////////// CONFIRM
class UI_Confirm extends UI_Base {
	constructor() {
		super()
		this.css('ui-confirm')
	}
	
	_open({message, callback, type, content, buttons}) {

		this._callback = callback 
		
		var btn = buttons ? buttons : ['Ok']
		var is_alert = ['alert','error'].includes(type)
		
		if (is_alert) 			this.css(`ui-confirm-${type}`)
		else if (!buttons) 		btn.push('Cancel')
		
		btn = btn.map((b,i) => this.button('button', b).data({index: i}))
		this.clear()._(
			_('div').css('ui-confirm-title')._(message),
			content,
			_('div')._(... btn)
		)
		return this
	}
	on_button_click(e) {
		if (this._callback) this._callback( parseInt(e.currentTarget.dataset.index) )
		this.remove()
	}
	
	/**
	on_confirm_click(e) {
		if (this.confirm_callback) this.confirm_callback(1)
		this.remove()
	}
	on_cancel_click(e) {
		if (this.confirm_callback) this.confirm_callback(0)
		this.remove()
	}
	**/
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
					_('tr')._(['#', 'ID', 'Name', 'Items', 'Created','Modified','Size','Inflate', '', 'Actor'].map(e => _('th')._(e)))),
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
					//console.log( stores )
					
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
					app.get_column(e.itemCount),
					app.get_column(new Date(e.createdAt * 1000)),
					app.get_column(new Date(e.modifiedAt * 1000)),
					app.get_column(e.stats?.s3StorageBytes),
					app.get_column(e.stats?.inflatedBytes),
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

///////////////////////////////////////////// DATASET
class UI_Dataset extends UI_Base {
	
	constructor() {
		super()
		
		this.css('ui-modal','flex-col')._(
			_('div').css('flex-col')._(
				// title
				this._info = _('div').css('ui-dataset-info'),
				this._view = _('div'),
				
				// content
				this._table = _('table').css('ui-table', {'flex-grow':1})._(
					this._head = _('thead').css('sticky-t'),
					this._list = _('tbody')
				),
				// pager
				this._page = _('div').css('page-list').data({command:'page'}).on('click', this),
				// control
				_('div').css('button-list')._(
					this.button('close', 	'CLOSE').on('click', this),
					this.button('google', 	'GOOGLE').on('click', this)				
				)
			)
		)

		// data
		this._page_item = null // selected
		this._head_list = []		
		this._data = []
		this._schema = null
		this._fields = null
	}
	
	on_close_click 	= e => app.animate_close(this)
	on_page_click 	= e => this.page_view(parseInt(e.target.dataset.page||0), e.target)
	
	head_view = () => {
		var	head = this._head_list.map(e => e.label)
		this._head.clear()._( _('tr')._( _('th').css('sticky-l')._('#'), ... head.map(n => _('th')._(n) ) ) )
	}
	
	page_view = (index, node) => {
		
		var data = this._data, 
			head = this._head_list
		
		data = data.slice(index, index+PER_PAGE)
				
		this._list.clear()._(
			... data.map(e => _('tr')._(
				_('th').css('row-index','sticky-l')._(++ index),
				... head.map(h => app.get_column(deep_get(e, h.path)).data({head:h.label}))
			))
		)
		this._table.scroll({top:0, left:0}) //, behavior:'smooth'})
		//
		if (node) {
			if (this._page_item) delete this._page_item.dataset.selected
			this._page_item = node.data({selected:1})
		}
	}
	
	_load = (name, type) => {

		this.run(
		
		Promise.all([
			app.api({command:'storage-list', name}).then(res => res?.data).catch(e => console.log('GET META: ERROR')),
			app.cache_get(`meta:${name}`).then(res => res?.data)
		])
		.then(res => {
			
			var task = []
			var [fresh, cache] = res

			this._meta = fresh || cache

			if (!fresh || (cache && (cache.modifiedAt === fresh.modifiedAt))) {
							
				// CACHE
				return app.cache_get(`data:${name}`).then(res => res?.data)
			
			} else {

				// STALE
				if (fresh) {
					
					// SAVE META
					app.cache_set({id:`meta:${name}`, data:fresh})
					
					return app.api({command:'storage-data', name, type:parseInt(type||0)}, null, app.progress_iu.update)
						.then(res => res?.raw && app.cache_set({id:`data:${name}`, data:res.raw}).then(e => res.raw))
						.catch(e => console.log('GET DATA: ERROR'))
				}
			}
		})
		
		.then(raw => raw && DecompressB64(raw).then(raw => JSON.parse(raw)))
		
		.then(data => {
			
			// RESET
			this._data = []
			this._page_item = null
			this._head_list.length = 0
			this._page.clear()
			this._head.clear()
			this._list.clear()
			
			this._info.clear()
			this._view.clear()

			if (data) {

				var meta = this._meta

				// TITLE
				var actor = meta && meta.actId && app.actors[meta.actId]

				this._info._(
					_('span').data({title:'ACTOR'})._(
						(actor?.pictureUrl) && _('img').css('actor-icon').attr({src: actor.pictureUrl}),
						actor?.title || '<unknown-actor>'
					),
					
					_('span').data({title:'ID'})._(meta.id),
					_('span').data({title:'NAME'})._(meta.name || '<noname>'),
					_('span').data({title:'ITEMS'})._(meta.itemCount || 0)
				)
				
				// VIEW
				var views = this._meta?.schema?.views
				
				this._view._(
					this.button('', 'ALL').data({command:'view',view:'all'}),
					... (views ? Object.keys(views).map( e => this.button(e, views[e]?.title||e).data({command:'view',view:e}) ) : []),
					this.button('', 'ADD').data({command:'custom'}),
				)
				
				// FIELDS
				var sel = {}
				var col = meta?.fields
				
				if (col) {
					for (var c of col) {
						c = c.split('/')
						var node = sel
						for (var t of c) {
							if (!(node[t])) node[t] = {}
							node = node[t]
						}
					}
				}
				this._fields = sel
				
				// HEAD
				var head = []

				for (var e of data)
					for (var k of Object.keys(e))
						if (!head.includes(k)) head.push(k)

				this._head_all = this._head_list = head.map(e => ({label:e, path:e.split('.')}))
				this.head_view()

				// DATA						
				for (var p = 0; p < data.length; p += PER_PAGE) {
					this._page._(_('span').css('page-item').data({page:p})._(`${p+1}-${p+PER_PAGE}`))
				}
				this._data = data
				this.page_view(0)
			}
		})
		
		)
		return this
	}
	
	on_custom_click = e => {
		
		new Promise((resolve) => this._( _('div', {is:'ui-fields-selector'})._load(this._fields, undefined, resolve) ))
		.then(res => console.log(res))
				
	}
	on_view_click = e => {
		var { view } = e.target.dataset
		
		if (view === 'all') {
			this._head_list = this._head_all
			
		} else if (view) {
			var columns = this._meta?.schema?.views[view]?.display?.columns 
			console.log(columns)
			this._head_list = columns.map(e => ({label:e.label||e.field, format:e.format, path:e.field.replace(/\[(\d+)\]/g, '.$1').split('.')}) )
		}

		this.head_view()
		this.page_view(0)
	}
	
	on_google_click = e => {
		
		const TOKEN = 'ya29.a0Ael9sCNl0aHd_Bfs1RxpzRxaWWsAU6MAB3663xxXpB6h8BCmHdicApKxc5YIK1stFHwMGy-ukN2V-eXBC2bwhIAKCczOAH5YEObPXKW0mB7mT4QUSNqjpe7AxrdKBOp4htMXoXCNq0IXcRXE-s5wcna_LovbaCgYKAcwSARESFQF4udJhF5_uYvW6xZAgquVcyAr87w0163'
		
		const DOC_TITLE = 'Apify Dataset' 
		const SHEET_TITLE = 'Dataset ID'
		
		const _send = (url, data) => fetch(url, {
				method	: 'POST',
				headers	: {'Authorization': `Bearer ${TOKEN}`},
				body	: JSON.stringify(data)
			})
			.then(res => res.json())
			.then(res => res.error ? Promise.reject(res.error) : res)
		
		
		var flow = _send('https://sheets.googleapis.com/v4/spreadsheets', {
			properties: {
				title			: DOC_TITLE,
				defaultFormat	: {
					wrapStrategy: 'CLIP',
					textFormat: {
						fontFamily: 'Calibri'
					}
				}
			},
			sheets: [
				{
					properties: {
						title: SHEET_TITLE
					}
				}
			]
		})
		
		.then(res => {

			console.log(res) 
			
			var sid = res.spreadsheetId
			
			var head = this._head_list
			
			var sid = res.spreadsheetId
			var range = SHEET_TITLE // 'Sheet1!A1:A1'
			var data = {
				range,
				majorDimension: 'ROWS',
				values: [
					head,
					... this._data.map( row => head.map((n,i) => {
						var col = row[n]
						
						if (col === undefined || col === null)
							return col
						
						if ([Object, Array].includes(col.constructor))
							return JSON.stringify(col)
						
						return col
					
					}))
				]
			}

			return _send(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${range}:append?valueInputOption=RAW`,  data)
				.then(e => {					
					console.log(e)

					return _send(
						`https://sheets.googleapis.com/v4/spreadsheets/${sid}:batchUpdate`,
						{
							requests: [
								{
									repeatCell: {
										range: {
											sheetId:  res.sheets[0].properties.sheetId
										},
										cell: {
											userEnteredFormat: {
												wrapStrategy: 'CLIP', verticalAlignment: 'TOP',
												textFormat: {
													fontFamily: 'Calibri'
												}
											}
										},
										fields: 'userEnteredFormat(wrapStrategy,textFormat,verticalAlignment)'
									}
								},
								{
									repeatCell: {
										
										range: {
											sheetId:  res.sheets[0].properties.sheetId,
											startRowIndex: 0,
											endRowIndex: 1,
										},
										cell: {
											userEnteredFormat: {
												backgroundColor: { red: 11/255, green: 85/255, blue: 157/255 },
												horizontalAlignment : 'CENTER', wrapStrategy: 'WRAP',
												textFormat: {
													foregroundColor: {red: 1.0, green: 1.0, blue: 1.0},
													//fontSize: 12,
													bold: true
												}										
											}
										},
										fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,horizontalAlignment)'
									}
								}
							],
							includeSpreadsheetInResponse: false,
							//responseRanges: [ string ],
							responseIncludeGridData: false
						}
					)
				})			
		})

		.then(res => console.log(res))
		.catch(error => this.confirm({message:error.message, type:'error'}))
		
		this.run(flow)
		
	}
}

///////////////////////////////////////////// FIELDS SELECTOR

class UI_FieldSelector extends UI_Base {
	constructor() {
		super()
		this.css('ui-modal','flex-col')._(
			// CONTENT
			_('div').css('ui-fields-selector','flex-row')._(
				// LEFT
				_('div').css('flex-col', {'flex-shrink':0})._(
					_('div').css('ui-big-title')._('Select Fields'),
					this._select = _('div').css('flex-col', {'flex-grow':1}),
				),
				
				// RIGHT
				_('div').css('flex-col', {'flex-grow':1})._(
					_('div').css('ui-big-title')._('Custom View'),
					//this._list = _('div').data({command:'remove'}).on('click', this),
					_('div').css('flex-col', {'flex-grow':1})._(
						_('table').css({display:'block'})._(
							_('thead')._(_('tr')._( _('th')._('Name'), _('th')._('Source') )),
							this._list = _('tbody')
						)
					),
					_('div')._(
						this.button('reset', 	'RESET'),
						this.button('cancel', 	'CANCEL'),
						this.button('done', 	'DONE')
					)
				)
			)
		)
		
	}
	
	deselect = key => {
		for (var e of this._list.querySelectorAll(`tr[data-key="${key}"]`)) 
			e.remove()
		for (var e of this._select.querySelectorAll(`span[data-key="${key}"]`))
			delete e.dataset.selected
	}
	
	
	_load = (root, list, resolve) => {
		// recursive
		const __get = (node, path = []) => {
			var keys = Object.keys(node)
			if (keys.length)
				return _('ul')._(
					... Object.keys(node).map( e => _('li')._( _('span').data({key:[...path, e].join('.')})._(e), __get(node[e], [...path, e]) ) )
				)
		}
		
		// start
		this._resolve = resolve
		this._select.clear()._( __get(root).data({command:'select'}).on('click',this) )
		return this
	}		

	on_done_click 	= e => app.animate_close(this) && this._resolve('OK')
	on_cancel_click = e => app.animate_close(this)
	on_reset_click 	= e => {
		this._list.clear()
		for (var e of this._select.querySelectorAll(`span[data-selected]`))
			delete e.dataset.selected		
	}
	
	on_select_click = e => {
		var t = e.target, d = t.dataset
		var key = d.key
		if (key) {
			if (d.selected) {
				this.deselect(key)
			} else {
				d.selected = 1
			
				this._list._( _('tr').data({key})._(  
					_('td')._( _('input').attr({type:'text', size:40, placeholder:key}) ),
					_('td')._( _('span')._(key) )
				) )
			}
		}
	}

}

///////////////////////////////////////////// PROGRESS
class UI_Progress extends UI_Base {
	constructor() {
		super()
		
		this.css('ui-progress')._(
			this._head = _('div').css('ui-progress-text'),
			_('div').css('ui-progress-bar')._(
				this._line = _('div')
			)
		)
		
		this._caption = ''
		this.update = this.update.bind(this)
	}
	
	update(data) {
		if (data) {
			// SHOW
			if (!this.parentNode) {
				this._caption = ''
				this._head.clear()
				this._line.css({width:'0'})
				window.document.body._(this)
			}
				// UPDATE
			var {loaded, total, caption} = data
			var per = 0

			if (caption) this._caption = caption

			if (loaded && total) {
				//console.log('PROGRESS', data)
				if (total) {
					per = 100 * loaded / total
					per = `${per.toFixed(2)}%`
				}
			}

			this._head.clear()._(this._caption, per ? per: null)
			this._line.css({width:per})
			return
		}

		// RESET
		this._caption = ''
		this.remove()
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
	on_airtable_click 	= e => this.run(app.auth('airtable').then(res => {
		//console.log('CODE', res)
		app.api({command:'auth-done', data:res})
	}))
	on_google_click 	= e => this.run(app.auth('google').then(res => {
		//console.log('CODE', res)
		app.api({command:'auth-done', data:res})
	}))
}

////////////////////////////////////// BOOT

window.on('load', e => {

	// app.host = localStorage.getItem('server')||''
	
	customElements.define( 'ui-list-editor', 		UI_ListEditor, 		{extends:'div'} )
	customElements.define( 'ui-actor', 				UI_Actor, 			{extends:'div'} )
	customElements.define( 'ui-storage',			UI_Storage,			{extends:'div'} )
	customElements.define( 'ui-dataset',			UI_Dataset, 		{extends:'div'} )
	customElements.define( 'ui-fields-selector',	UI_FieldSelector,	{extends:'div'} )
	customElements.define( 'ui-progress', 			UI_Progress, 		{extends:'div'} )
	customElements.define( 'ui-confirm',			UI_Confirm,			{extends:'div'} )
	customElements.define( 'ui-main', 				UI_Main, 			{extends:'div'} )


	var query = new URLSearchParams(window.location.search)
	var param = query.get('param')
	if (param) {
		param = JSON.parse(atob(param))
		console.log('PARAM', param)
		app.host = param.server
	}

	app.progress_iu = _('div', {is:'ui-progress'})	
	app.main_ui 	= _('div', {is:'ui-main'})
	
	// INIT UI
	window.document.body._( app.main_ui )
	
}, {once: true} )