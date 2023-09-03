import { UI_Base, Application } from "../core.js"

class TUBE_APP extends Application {
	api_url = '/scraper/tubes/api'
	
	
	portal_feed = {}
	
	portal_config = {}
	portal_object = {} 
	
	//network_icon 	= net => _('span').css('ui-network-ico', {backgroundImage:`url("${this.portal_config[net]?.ico || 'default.png'}")`})
	network_icon 	= net => _('span').css('ui-network-ico').data({net})
	network_banner 	= net => _('span').css('ui-network-ban', {backgroundImage:`url("${this.portal_config[net]?.ban || 'default.png'}")`})


	get_feed = (net, sec, key='') => {
		var guid = `${net}:${sec}:${key}`
		var list = this.portal_feed
		if (!(guid in list)) list[guid] = _('div', {is: 'ui-feed'})._init(net, sec, key)
		return list[guid]
	}
}

///////////////////////////////////////////////////////////////////////////////////////
class UI_Main extends UI_Base {
	
	constructor() {
		super()
		
		this.css('ui-main', 'flex-col').data({command:'action'}).on('action', this, true)._(
			
			// INPUT
			_('div').css('ui-main-bar', 'flex-row')._(
				this._banner = _('div'),
				this._input = _('div').css('ui-main-input', 'flex-col'),
				_('div')._(
					_('button')._('Portals').data({action:'portal-list'})
				),
				this._menubar = _('div')
			),
			
			// COLLECTION BUTTONS
			this._submenu = _('div'),
			
			// FEED
			this._main = _('div').css('ui-main-feed', 'flex-col')._(
				// PORTALS
				this._portal = _('div').css('ui-main-portal', 'flex-col')._(
					this._portal_list = _('div').css('ui-portal-list', 'flex-row', 'flex-wrap'),
					this._portal_pick = _('div').css('ui-portal-main', 'flex-row', 'flex-wrap'),
				),			
			),
			
			// PAGER
			this._bottom = _('div').css('ui-main-bottom', 'flex-col')._(
				this._pager = _('div').css('ui-main-pager')
			),
			

		)
		.on('click', e => e.target.fire('action'))

		///
		app.api({cmd: 'config'}).then(res => {
			
			app.portal_config = Object.fromEntries( res.data.map( e => [e.key, e]) )
			
			this._portal_pick.clear()
				
			var sheet = document.styleSheets[0]
			
			for (var t of res.data) {				
				// icon
				if (t.ico)
					sheet.addRule(`.ui-network-ico[data-net="${t.key}"]`, `background-image: url("${t.ico}");`)
				
				// banner
				sheet.addRule(`[data-ban="${t.key}"]::before`, `content: "${t.tit||t.key}"`)
				if (t.ban) 	{
					sheet.addRule(`[data-ban="${t.key}"]`, `background-image: url("${t.ban}");`)
					sheet.addRule(`[data-ban="${t.key}"]::before`, `visibility: hidden`)
				}

				this._portal_pick._( 
					app.portal_object[t.key] = _('div', {is: 'ui-portal'})._init(t)
				)
			}
		})
	}
	
	on_action = e => {
		var { target } = e
		var { dataset } = target 

		switch (dataset.action) 
		{
		case 'portal-list':
		
			var p = this._portal
			if (p.parentNode) p.remove()
			else {
				var list = this._main
				list.insertBefore(p, list.firstChild)
			}
			break
		
		case 'portal-open':

			var { parentNode:p } = target
			var { net } = dataset
			
			this._banner.clear()._( app.network_banner(net))
			this._menubar.clear()._(p._menu)
			this._submenu.clear()._(p._cols)
			
			//break
			
		case 'portal-feed':

			console.log('UI_Main.on_action()', dataset)
			
			this._portal.remove()
			
			var { net, sec, key } = dataset			
			
			sec ||= 'vid'
			var feed = app.get_feed(net, sec, key)
			if (key) app.portal_object[net].add_submenu(net, sec, key)
			// input
			
			this._input.clear()
			this._pager.clear()
				
			for(var [n,f] of Object.entries(feed._input)) {				
				switch(n) {
				case 'search':
					this._input._( f )
					break
				case 'page':
					this._pager._( f )
					break
				case 'cursor':
					this._pager._( f )
					break
				}
			}
			
			// feed
			this._main.clear()._( feed )
			break
			
		case 'thumb-view':
		
			this._( _('div', {is: 'ui-video'})._init(dataset) )
			
			
				/**
				console.log('UI_Main.on_action()', dataset)
				
				var { net, sec, key } = dataset			
				var feed = app.get_feed(net, sec, key)
							
				var { search, page } = feed._input
				
				this._banner.clear()._( app.network_banner(net))
				this._input	.clear()._( search )
				this._pager	.clear()._( page )
				this._main	.clear()._( feed )
				**/
			break
		
		case 'thumb-open':
			var { url } = dataset
			window.open(url)
			break
			
		}
	}

}

///////////////////////////////////////////////////////////////////////////////////////
class UI_Portal extends UI_Base {
		
	constructor() {
		super()
		this.css('ui-portal')
	}
	_init = config => {

		this.clear()
		
		// banner
		this._(
			_('div').css('ui-portal-ban').data({action:'portal-open', net: config.key, 'ban':config.key})
		
		)

		// main menu
		if (config.sec) {
			this._menu = _('div').css('ui-portal-menu', 'flex-row')._(
				Object.keys(config.sec).map(e => _('button').data({action:'portal-feed', net:config.key, sec:e})._(e))
			)
		}

		// collection
		this.submenu_list = {}
		this._cols = _('div').css('ui-video-tag')
		
		return this
	}
	
	add_submenu = (net, sec, key) => {
		var guid = `${sec}:${key}`
		var list = this.submenu_list
		if (!(guid in list))
			this._cols._(list[guid] = _('span').data({action:'portal-feed', tag:sec, net, sec, key})._(key))
	}
}

///////////////////////////////////////////////////////////////////////////////////////
class UI_Feed extends UI_Base {
	
	_loading = 0
	
	constructor() {
		super()
		this.css('ui-feed', 'flex-row', 'flex-wrap')//.data({command:'action'})// .on('click', this)
	}

	_init = (net, sec, key) => {

		this._net = net
		this._sec = sec
		this._key = key

		var config = app.portal_config[net]
		this._config 	= config		
		this._input		= {} // input list
		
		if (key)
			var arg = config?.sec?.vid?.feed
		else
			var arg = config.sec && config.sec[sec] && config.sec[sec].feed
		
		if (arg && Object.keys(arg).length) {
			this._input = Object.fromEntries(
				Object.entries(arg).map( e => [e[0], _('div', {is: 'ui-filter'})._init(this, e[0], e[1])] )
			)
		} else
			this._load()		
		
		return this
	}
	
	_load = (resetpage) => {
		if (this._loading) return
		
		if (resetpage) {
			for (var f of Object.values(this._input)) {
				if (f._name === 'page') {
					f.resetpage()
					break
				}
				else if (f._name === 'cursor')
					f._value = ''
		}
		}

		var arg = Object.fromEntries( Object.values(this._input).map(e => [e._name, e._value]) )
		
		var prom = null

		this._loading = 1
		
		if (this._key) {
			prom = app.api({cmd:'explore', portal: this._net, section:'vid', sub:this._sec, key: this._key, ... arg})
		} else {
			prom = app.api({cmd:'explore', portal: this._net, section:this._sec, ... arg})
		}
		
		prom.then(res => {
				this.clear()._(
					res.data.map( e => _('div', {is: 'ui-thumb'})._init(e) )
				)
				
				// cursor
				var { next } = res, { cursor } = this._input 
				if (next && cursor) cursor._value = next
			})
			.finally( () => this._loading = 0 )
	}
}

///////////////////////////////////////////////////////////////////////////////////////

class UI_Filter extends UI_Base {
	
	constructor() {
		super()
		this.css('ui-filter')		
	}
	
	on_page = e => {
		console.log('on_page()', e)
		e.stopPropagation()
		
		var { target } = e, { dataset } = target
		
		this._value = parseInt(dataset.page)
		
		if (this._previtem) this._previtem.dataset.status = 'visited' 
		this._previtem = target
		
		dataset.status = 'active'
		
		this._feed._load()
	}
	on_cursor = e => {
		console.log('on_cursor()')
		e.stopPropagation()		
		this._feed._load()
	}
	
	on_press = e => {
		var { target } = e
		if (e.keyCode == 13) { 
			target.blur()
			this._feed._load(true)
		}
		else {
			this._value = target.value.trim()
		}
	}
	
	resetpage = () => {
		if (this._name !== 'page') return
		
		this._value = this._config.def || ''
		this._previtem = undefined
		
		for (var t of [... this.childNodes])
			delete t.dataset.status
	}

	_init = (feed, name, config) => {
		
		var { type, def } = config
		this._name 		= name 
		this._feed 		= feed
		this._config 	= config
		this._type 		= type
		this._value 	= def || ''
		
		this.clear()
		
		switch (type) {
		case 9: // paging
			for (var i = 1; i <= 10; ++i)
				this._( _('span').css('page-item')._(i).data({page:i}) )

			this.on('click', this.on_page)
			break
		
		case 1: // numeric
			break

		default: // string
			
			switch (name) {
			case 'cursor':
				this._( _('button')._('more') ).on('click', this.on_cursor)
				break
			case 'search':			
				this._( this._elem = _('input').attr({type:'text', placeholder:`search`}).on('keyup', this.on_press) )
				break
			default:
				this._( this._elem = _('input').attr({type:'text'}).on('keyup', this.on_press) )
				break
			}
		}
		return this
	}
}

///////////////////////////////////////////////////////////////////////////////////////
class UI_Thumb extends UI_Base {
	
	constructor() {
		super()
		this.css('ui-thumb')
	}
	
	_init = data => {

		var rec = Object.assign({}, data)
		var { net, key, tit, ext, sec, url } = rec
		var ext_net, ext_key
		if (ext) {
			Object.assign(rec, ext)
			var { net:ext_net, key:ext_key } = ext
		}
		var { tmb, cov, sec } = rec		

		tmb ||= cov
		ext_net ||= ''
		ext_key ||= ''
		
		var att = {action: (sec==='vid') ? 'thumb-view': 'portal-feed', sec, net, key, ext_net, ext_key}		
		var bg
		
		this.clear()._(
			bg = _('div').css('ui-thumb-tmb').data(att),
			_('div').css('ui-thumb-tit')._(tit||key), //.data(att),
			app.network_icon(rec.net).data({action:'thumb-open', url})
		)
		.data({sec, dir:(rec.sec!=='vid')?1:0})
		
		//
		if (tmb) {
			var img = _('img')
			img.on(['error', 'load'], e => {
				switch(e.type) {
				case 'load':
				
					var { naturalWidth:w, naturalHeight:h, src } = e.target
					bg.css({backgroundImage: `url("${src}")`})
					if (h > w)
						bg.css({height:0, paddingBottom: (100*h/w)+'%', borderRadius:'9px'})
					break
					
				case 'error':
					break
				}					
			})

			img.src = tmb
		}
		
		this._data = rec
		return this
	}

}

///////////////////////////////////////////////////////////////////////////////////////
class UI_Video extends UI_Base {
	constructor() {
		super()
		this.css('ui-video').css('cs-modal','flex-row')._(

			// contents
			_('div').css('ui-video-main','flex-col')._(
				// player
				this._player = _('div').css('ui-video-play'), // player
				// info
				this._info = _('div').css('ui-video-info'),
				
			),
			
			// related
			this._related = _('div').css('ui-video-list','flex-col'), 
			
			// buttons
			_('div').css('flex-col')._(
				_('button')._('close').on('click', e => this.remove()),
				this._network = _('div').css('ui-video-net', 'flex-col'),
			)
		)
		.data({command: 'action'})
		.on('click', this, true)		
	}
	_init = (data, netclear=true) => {
		
		var { net, key, ext_net, ext_key } = data

		if (netclear) {
			var ico = [{net, key}]
			if (ext_net && ext_key) {
				ico.push({net:ext_net, key:ext_key})			
				net = ext_net
				key = ext_key
			}
			this._network.clear()._( ico.map(e => app.network_icon(e.net).data({action:'video-net', ... e}) ) )
		}
		
		app.api({cmd:'explore', section:'vid', portal:net, key}).then(res => {
			var { data } = res
			data = data[0]
			
			if (data) {
				
				this._data = data

				// tags
				var tag_list = []
				for (var n of ['act', 'col', 'usr', 'cat', 'pls', 'tag']) {
					var arr = data[n]
					if (arr)
						tag_list.push( 
							... arr.map(e => (e.constructor === String) ? {key:e}: e).map(e => ({action:'portal-feed', tag:n, net, sec:n, key:e.key||'', tit:e.tit||e.key||''})) 
						)
				}

				this._info.clear()._(
					// title
					_('div').css('ui-video-tit')._(data.tit),
					
					// embed
					_('div').css('ui-video-tag')._(
						data?.src && _('span')._('player').data({action: 'video-src'}),
						data?.emb?.url && _('span')._('embed').data({action: 'video-emb', url:data.emb.url}),
					),
					
					// description
					data?.des && _('div').css('ui-video-des')._(data.des),

					// tags
					_('div').css('ui-video-tag')._( ... tag_list.map(e => _('span').data(e)._(e.tit) ) )
				)
				
				this._player.clear()._(_('div', {is: 'ui-player'})._init(data) )

				
				// related
				var { rel } = data
				if (rel) 
				{
					this._related.clear()._(
						... rel.map(e => _('div', {is: 'ui-thumb'})._init(e) )
					)
				}
				else 
				{
					app.api({cmd:'explore', portal:net,  section:'vid', key, sub:'vid'}).then(res => {
						this._related.clear()._(
							... res.data && res.data.map(e => _('div', {is: 'ui-thumb'})._init(e) )
						)
					})
					
				}
			}
		})
		
		return this
	}

	on_action = e => {
		
		console.log('UI_Video.on_action')
	
		var { dataset } = e.target
		var { action } = dataset
		
		switch (action) {
		case 'thumb-view':
			if (dataset.sec === 'vid')
				this._init(dataset)
			else
				alert('TODO')
			break
			
		case 'portal-feed':
			
			setTimeout(e => this.remove(),0)
			return
			
		case 'video-net':
			this._init(dataset, false)
			break
		
		case 'video-src':
			this._player.clear()._(_('div', {is: 'ui-player'})._init(this._data) )
			break
			
		case 'video-emb':
			this._player.clear()._(
				_('iframe').attr({src: dataset.url})
			)
			break
			
		default:
			return
		}
		
		e.stopPropagation()		
	}
}

class UI_Player extends UI_Base {
	constructor() {
		super()	
		this.css('ui-player')._(
			
			this._video = _('video').css('ui-player-video').attr({controls:'', muted:''}),
			
			this._title = _('div').css('ui-player-title'),
			
			this._control = _('div').css('ui-player-control')._(
				_('span')._('source').data({action: 'source-list'}),
				this._source = _('div')
			),
			
		)
		.data({command: 'action'})
		.on('click', this, true)
	}
	_init = data => {
		
		console.log('UI_Player.init()', data)
		
		this._title.clear()._(app.network_icon(data.net))
		
		var { src } = data
		if (src) {
			this._source.clear()
			for (var [i,s] of src.entries()) {
				this._source._(
					_('span').data({action:'source-play', 'url': s.url})._(s.res || i)
				)
			}
		}
		return this
	}
	on_action = e => {
		e.stopPropagation()
		console.log('UI_Player.on_action')
		
		var { dataset } = e.target
		var { action } = dataset
		
		switch (action) {
		case 'source-play':
			var { url } = dataset
			this._video.src = url
			break
		}
	}
	
}

const app = window._app = new TUBE_APP()

window.on('load', e => {
	customElements.define('ui-main',		UI_Main, 			{extends:'div'} )
	customElements.define('ui-portal',		UI_Portal, 			{extends:'div'} )
	customElements.define('ui-feed',		UI_Feed, 			{extends:'div'} )
	customElements.define('ui-thumb',		UI_Thumb, 			{extends:'div'} )
	customElements.define('ui-filter',		UI_Filter, 			{extends:'div'} )

	customElements.define('ui-video',		UI_Video, 			{extends:'div'} )
	customElements.define('ui-player',		UI_Player, 			{extends:'div'} )
	
	window.document.body._( _('div', {is:'ui-main'}) )
	
}, {once: true})
