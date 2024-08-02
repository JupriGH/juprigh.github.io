import { UI_Base } from '../core.js'
import { app, fetch_gzip, gunzip } from './app.js'

const 	LIST_ACTORS   = '__ACTORS__',
		LIST_DATASETS = '__DATASETS__',
		LIST_KEYVALUE = '__KEYVALUE__'

const 	ICON_APIFY = 'https://apify.com/favicon.ico',
		ICON_BLANK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'

const	PER_PAGE = 100

////////////////////////////////////// UTILS
const range = (min,max,step=1) => Array.from({length:Math.ceil((max-min)/step)}, (_,i) => min + (i * step))

const get_column = (value, format) => {
	if (value === null) 				return _('td').css('col-empty')._('null') 
	if (value === undefined) 			return _('td').css('col-empty')._('undefined')
	if (value.constructor === Boolean)	return _('td').css('col-bool')._(value)
	if (value.constructor === Number)	return _('td').css('col-number')._(value)
	if (value.constructor === Date)		return _('td').css('col-date')._(value.toLocaleString('en-GB'))
	if (value.constructor === Object)	return _('td').css('col-object').data({view:1})._(JSON.stringify(value))
	if (value.constructor === Array)	return _('td').css('col-array') .data({view:1})._(JSON.stringify(value))
	if (value.constructor === String) {
		
		// format: link, image
		if (value.match(/^https?:\/\//))
			return _('td')._( _('a').attr({href:value,target:'_blank'})._(value) )
		else if (value.match(/^(\+\-)?[0-9.,]+$/))
			return _('td').css('col-number')._(value)
		else
			// STRING
			return _('td')._(value)
	
	}
	return _('td')._(value.toString())
}
	
/*
const DeCompressB64 = async data => {
	var arr = Uint8Array.from(atob(data), c => c.charCodeAt(0))
	var blob = new Blob([arr.buffer])
	return gunzip(blob)
}
*/

/**
const CompressText = async source => {
	const cs = new CompressionStream("gzip")
	const blob = new Blob([source])
	const stream = blob.stream().pipeThrough(cs)
	return await new Response(stream)
}

const TDecompress = async source => {
	const ds = new DecompressionStream("gzip")
	const blob = new Blob([source])
	const stream = blob.stream().pipeThrough(ds)
	return await new Response(stream)
}
**/

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





////////////////////////////////////// BUTTON LIST
class UI_Pager extends UI_Base {
	constructor() {
		super()
		this._item = null // selected	
		this.on('click', this.on_button.bind(this))
	}
	// [value, label], ...
	_add = (... entries) => this._( ... entries.map(e => _('span').css('ui-button-item').data({value:e[0]})._(e[1])) )
	
	on_button = e => {
		var t =  e.target, value = t.dataset.value
		if (value !== undefined) {
			if (value) {
				if (this._item) delete this._item.dataset.selected
				this._item = t.data({selected:1})
			}
			this.fire('change', value)
		}		
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

		if (['alert','error'].includes(type)) 	this.css(`ui-confirm-${type}`)
		else if (!buttons) 	 					btn.push('Cancel')
		
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
		this.animate_close()
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
			_('div').css('ui-big-title')._('Storage List'),
			_('div')._(
				this.button('refresh','REFRESH'),
				this.button('data-ds','DATASET'),
				this.button('data-kv','KEY-VALUE')
			),
			_('table').css('ui-table')._(
				_('thead').css('sticky-t')._(
					_('tr')._(
						_('th').css('sticky-l')._('#'),
						... ['Actor', 'Dataset-ID', 'Name', 'Items', 'Created','Modified','Size','Inflate'].map(e => _('th')._(e)),
						_('th').css('sticky-r')._('Cached'),
					)
				),
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
		
		if ( ((type === 0) && !this._data_ds) || 
			 ((type !== 0) && !this._data_kv)
		) {
			this.run(
				
				app.api({command:'storage-list', type}).then( res => {
					
					console.log('UPDATE CACHE STORAGE LIST')
					
					// actors
					var actors = res?.data?.actors
					if (actors) app.cache({command:'set-meta', id:LIST_ACTORS, data:actors})
					
					// stores
					var stores = res?.data?.stores
					if (stores) app.cache({command:'set-meta', id:(type === 0)? LIST_DATASETS:LIST_KEYVALUE, data:stores})
					
					return [actors, stores]
				})
				.catch(e => (
					console.log('ERROR OFFLINE', e),				
					this.confirm({message:e.error||e, type:'error'}).then( _ =>  Promise.all([
						app.cache({command:'get-meta', id:LIST_ACTORS}), 
						app.cache({command:'get-meta', id:(type === 0) ? LIST_DATASETS:LIST_KEYVALUE})
					]))						
				))
				.then(res => { 

					var [actors, stores] = res

					if (actors)  Object.assign(app.actors, actors)
					if (stores) {
						if (type === 0) this._data_ds = stores
						else 			this._data_kv = stores
					}
					
					this.refresh_list() 
				})
			)
		} else {
			this.refresh_list()
		}
		return this
	}
	
	refresh_list() {
		
		var data = ((this._type||0) === 0) ? this._data_ds : this._data_kv
		var no = 0
		this._list.clear()
		if (data)
			this._list._( ... data.map(e => {
				var actor = app.actors[e.actId]

				return _('tr').data({id:e.id, type:this._type})._(
						_('th')._(++no).css('row-index','sticky-l'),
						_('td')._(
							actor ? [ 
								_('img').css('actor-icon').attr({src: actor.pictureUrl ?? ICON_BLANK}), 
								(actor.title) ? _('span')._(actor.title) : null
							] : null
						),
						_('td')._(`📁 ${e.id}`),
						_('td')._(e.name),
						get_column(e.itemCount),
						get_column(new Date(e.createdAt * 1000)),
						get_column(new Date(e.modifiedAt * 1000)),
						get_column(e.stats?.s3StorageBytes),
						get_column(e.stats?.inflatedBytes),
						_('td').css('sticky-r')
				)
			}))

		return this
	}
	on_data_ds_click = e => this.set_type(0)
	on_data_kv_click = e => this.set_type(1)
	on_refresh_click  = e => this.refresh_list()
	
	/** 
	on_dataset_open 	= e => {
		// this._( _('div', {is:'ui-dataset'})._load(e.detail.id) )
		app.api({command:'storages', name:e.detail.id, type:this._type})
	}
	*/	
	on_cell_click(e) {
		var o = e.target 
		if (o.tagName.toUpperCase() == 'TD' && o.cellIndex == 2) {
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
				_('div').css('flex-row', {'align-items': 'center', 'flex-shrink':0})._(
					// title
					this._info = _('div').css('ui-dataset-info'),
					this._view = _('div', {is: 'ui-pager'}).css('ui-dataset-view').data({command:'view'}).on('change',this),
				),
				// content
				this._table = _('table').css('ui-table', {'flex-grow':1})._(
					this._head = _('thead').css('sticky-t'),
					this._list = _('tbody')
				),
				
				// pager
				this._page = _('div', {is: 'ui-pager'}).css('ui-page-list').data({command:'page'}).on('change',this),
				
				// control
				_('div').css('button-list')._(
					this.button('excel', 	'EXCEL').on('click', this),					
					this.button('google', 	'GOOGLE').on('click', this),
					this.button('close', 	'CLOSE').on('click', this),
				)
			)
		)

		// data
		
		this._head_list = []		
		this._data = []
		this._meta 	= null
		this._fields = null
	}
	
	on_excel_click = e => {
		/*
		const handle = await showSaveFilePicker({
			suggestedName: 'name.txt',
			types: [{
				description: 'Text file',
				accept: {'text/plain': ['.txt']},
			}],
		});

		const blob = new Blob(['Some text']);

		const writableStream = await handle.createWritable();
		await writableStream.write(blob);
		await writableStream.close();
		*/
		
		console.log(this._meta)
		
		this.run(
			app.ws({command:'storage-data', format:'xlsx', type:0, 'name': this._meta.id}).then(res => console.log(res))

		).finally(() => 
			this.confirm({message:'Download', buttons:['Download','Cancel']}).then( btn => {
				console.log(btn) 
				if (btn === 0) {
					var b = new Blob(['testing'])
					var u = URL.createObjectURL(b)
					var a = _('a')
					a.download = 'file.txt'
					a.href = u
					this._(a)
					{ 	
						console.log(a)
						//a.fire('click') 
						a.click()
					}
				}
			})
		)
	}
	
	_load = (name, type) => {

		var success = false
		
		this.run(
		
			Promise.all([
			
				fetch_gzip({url:`https://api.apify.com/v2/datasets/${name}`})
						.then(res => res.json())
						.then(res => res.data)
						.catch(e => console.error(e)),
						
				//app.api({command:'storage-info', name}).then(res => res?.data).catch(e => console.log('GET META: ERROR')),
				
				app.cache({command:'get-meta', id:name})
			])
			.then(res => {
				console.log('RES #1', res)

				var [fresh, cache] = res				
				this._meta = fresh || cache || undefined
				if (!this._meta) {
					app.cache({command:'del-data', id:name})
					throw 'METADATA_NOTFOUND'
				}
				
				if (!fresh || (cache && (cache.modifiedAt === fresh.modifiedAt)))
					return app.cache({command:'get-data', id:name}) // get cache data
				else if (fresh) 
					app.cache({command:'set-meta', id:name, data:fresh}) // save fresh meta	
			})
			.then(res => 
				res || (
					console.log('GET_FRESH_DATA'),
					fetch_gzip({url:`https://api.apify.com/v2/datasets/${name}/items`, compress:'gzip', progress: progress_iu.update})
						.then(res => res.blob())
						.then(res => app.cache({command:'set-data', id:name, data:res}).then(e => res))
					
					//app.ws({command:'storage-data', name, type:parseInt(type||0), format:'json'}, null, app.progress_iu.update)
					//	.then(res => res?.raw && app.cache({command:'set-data', id:name, data:res.raw}).then(e => res.raw))
				)
			)
			.then(raw => raw && gunzip(raw).then(raw => JSON.parse(raw)))
			.then(data => {

				// RESET
				this._data = []
				this._head_list.length = 0
				
				this._info.clear()
				this._head.clear()
				this._list.clear()
				this._view.clear()
				this._page.clear()

				if (data) {

					var meta = this._meta

					// TITLE
					var actor = meta && meta.actId && app.actors[meta.actId]

					this._info._(
						_('span')._(
							_('img').css('actor-icon').attr({src: actor?.pictureUrl?? ICON_APIFY}),
							actor?.title || '<unknown-actor>'
						),
						
						_('span').data({title:'ID'})._(meta.id),
						meta?.name ? _('span').data({title:'NAME'})._(meta.name) : null,
						_('span').data({title:'CREATED'})._(new Date(meta.createdAt * 1000).toLocaleString('en-GB')),
						_('span').data({title:'ITEMS'})._(meta.itemCount || 0)
					)
					
					// VIEW
					var views = this._meta?.schema?.views
					
					this._view._add(
						['all','All'],
						... (views ? Object.keys(views).map( e => [e, views[e]?.title||e]) : []),
						['add', 'ADD']
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

					// PAGE
					this._page._add(... range(0, data.length, PER_PAGE).map(p => [p, `${p+1}-${p+PER_PAGE}`]))

					this._data = data
					this.page_view(0)
					
					success = true
				} 
			})
			.finally(() => success || this.remove())
		)
		return this
	}
	
	head_view = () => {
		var	head = this._head_list.map(e => e.label)
		this._head.clear()._( _('tr')._( _('th').css('sticky-l')._('#'), ... head.map(n => _('th')._(n) ) ) )
	}
	
	page_view = index => {
		
		var data = this._data, head = this._head_list
		
		data = data.slice(index, index+PER_PAGE)
				
		this._list.clear()._(
			... data.map(e => _('tr')._(
				_('th').css('row-index','sticky-l')._(++ index),
				... head.map(h => get_column(deep_get(e, h.path)).data({head:h.label}))
			))
		)
		this._table.scroll({top:0, left:0}) //, behavior:'smooth'})
	}
	
	on_close_click = e => this.animate_close() 
	on_page_change = e => this.page_view(parseInt(e.detail))
	on_view_change = e => {

		var view = e.detail
		switch (view) {
		case 'all':
			this._head_list = this._head_all
			break
			
		case 'add':
			new Promise((resolve) => this._( _('div', {is:'ui-fields-selector'})._load(this._fields, undefined, resolve) ))
				.then(res => console.log(res))
			return
			
		default:
			
			if (!view) return
			var dis = this._meta?.schema?.views[view]?.display
			if (!dis) return
				
			var col = undefined
			if (col = dis.columns)
				col = col.map(e => ({label:e.label||e.field, format:e.format, path:e.field.replace(/\[(\d+)\]/g, '.$1').split('.')}) )
			else if (col = dis.properties)
				col = Object.entries(col).map(e => ({label:e[1].label||e[0], format:e[1].format, path:e[0].replace(/\[(\d+)\]/g, '.$1').split('.')}) )

			if (col) this._head_list = col 
			else return
		}

		this.head_view()
		this.page_view(0)
	}
	
	on_google_click = e => {
		
		var head = this._head_list
		var data = this._data
		
		var tmp = data.map(e => Object.fromEntries(head.map(h => [h.label, deep_get(e, h.path)])))
		tmp = JSON.stringify(tmp)
		
		
		//console.log(tmp)
		
		CompressText(tmp).then( r => r.arrayBuffer() ).then( b => console.log( 
			//btoa(String.fromCharCode(... new Uint8Array(b))) 
			btoa(new TextDecoder('utf-8').decode(b))
		) )
		
		
		/**
		
		this.run(
			app.api({
			command: 'export',
			dataset: this._meta.id,
			type: 'google',
			head: this._head_list,
			})
		)
		**/
		return
		
		const TOKEN = ''
		
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
												backgroundColor: {red: 11/255, green: 85/255, blue: 157/255},
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

	on_done_click 	= e => this.animate_close() && this._resolve('OK')
	on_cancel_click = e => this.animate_close()
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
	
	update(data) { // {caption, count, total}

		if (data) {
			// INIT
			if (!this.parentNode) {				

				this._caption = ''
				this._head.clear()
				this._line.css({width:'0'})
				{ (data.root||main_ui||window.document.body)._(this) }
			}
			
			// UPDATE
			var {count, total, caption} = data
			var per = 0

			if (caption) this._caption = caption

			count = count||0
			if (total) {
				per = 100 * count / total
				per = `${per.toFixed(2)}%`
				this._line.css({width:per})
			} else {
				per = count
				this._line.css({width:'0'})
			}

			this._head.clear()._(this._caption,' ',per ? per: null)
			
		
		} else {
			// RESET
			this._caption = ''
			this.remove()
		}
	}
}

///////////////////////////////////////////// MAIN
class UI_Main extends UI_Base {
	
	constructor() {
		super()
		
		this.css('ui-main','flex-row')
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
				
		this.run(
			
			app.cache_init()
			.then(e => app.api({command:'config'}))
			
			/**
			.then(res => {
				
				console.log(res)
				return res
				
				var [node, config] = res 

				// config
				if (0) { //(config?.value) {
					 
					var actors = res?.data?.actors
					if (actors)  app.actors = Object.fromEntries(actors.map(e => [e.id, e]))
					}
					 
				}
			})
			**/
		)
	}

	set_content = content  => this._content.replaceWith( this._content = content )
	
	on_storage_click 	= e => this.set_content(_('div', {is:'ui-storage'}))
	//on_actor_click 		= e => app.cache_get('AONaNTUtji6ymussY').then(console.log)
	
	on_airtable_click 	= e => this.run(app.auth('airtable'))//.then(res => res && app.api({command:'auth-done', data:res})))
	on_google_click 	= e => this.run(app.auth('google'))	//.then(res => res && app.api({command:'auth-done', data:res})))
}

/////////////////////////////////////////// AUTH
export class UI_Auth extends UI_Base { 
	constructor() {
		super()
		
		this.css('ui-modal','ui-auth')._(
			_('div').css('center-fixed')._(
				_('img').css('cat-photo', 'drop-shadow').attr({src:'../res/cat.jpg'}),
				_('div').css('auth-message', 'drop-shadow')._('Make sure popup not blocked, or click here to reload.').data({command:'reload'}).on('click', this)
			)
		)
	}
	on_reload = e => location.reload()
}
	
////////////////////////////////////// BOOT
/**
window.on('load', e => {

	// app.host = localStorage.getItem('server')||''

	app.get_param()
	
	app.progress_iu = _('div', {is:'ui-progress'})	
	app.main_ui 	= _('div', {is:'ui-main'})
	
	// INIT UI
	window.document.body._( app.main_ui )
	
}, {once: true} )
**/

var main_ui = undefined, progress_iu = undefined

export const start_ui = () => {
	customElements.define( 'ui-list-editor', 		UI_ListEditor, 		{extends:'div'} )
	customElements.define( 'ui-actor', 				UI_Actor, 			{extends:'div'} )
	customElements.define( 'ui-storage',			UI_Storage,			{extends:'div'} )
	customElements.define( 'ui-dataset',			UI_Dataset, 		{extends:'div'} )
	customElements.define( 'ui-fields-selector',	UI_FieldSelector,	{extends:'div'} )
	customElements.define( 'ui-progress', 			UI_Progress, 		{extends:'div'} )
	customElements.define( 'ui-confirm',			UI_Confirm,			{extends:'div'} )
	customElements.define( 'ui-pager',				UI_Pager, 			{extends:'div'} )
	customElements.define( 'ui-main', 				UI_Main, 			{extends:'div'} )	
	
	progress_iu 	= _('div', {is:'ui-progress'})
	main_ui 		= app.main_ui = _('div', {is:'ui-main'})
	
	window.document.body._( main_ui )
}