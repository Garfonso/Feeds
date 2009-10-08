Feeds.GoogleFeed = Class.create({
	manager: false,
	articles: [],
	
	id: false,
	title: false,
	categories: false,
	sortid: false,
	firstItemSecond: false,
	unreadCount: false,
	
	continuation: false,
	
	className: "",
	type:'feed',
	
	initialize: function(manager)
	{
		this.manager = manager; // this is the Feeds.Google object - it contains everything you need for editing authentication aka SID/username/password
		this.articles = []; // cleanup prototyping
		this.className = "";
	},
	
	getRequestHeaders: function()
	{
		return this.manager.getRequestHeaders();
	},
	
	load: function(o)
	{
		try
		{
			this.raw = o;
			this.id = o.id || false;
			this.title = o.title || false;
			this.categories = o.categories || []; // array of categories
			this.sortid = o.sortid || 0;
			this.firstItemSecond = o.firstitemsec || 0;
			this.unreadCount = o.unreadcount || 0;
		}
		catch(e)
		{
			Mojo.Log.error(Object.toJSON(e));
		}
		
		this.setupClasses();
	},
	
	setupClasses: function() // FOR TEMPLATING
	{
		this.className = "feed";
		if (this.unreadCount)
		{
			this.className += " hasCount";
		}
		this.className = this.className.trim();
	},
	
	getID: function()
	{
		return this.id || false;
	},
	
	setUnreadCount: function(count)
	{
		this.unreadCount = count;
		this.setupClasses();
	},
	
	getArticles: function(callBack , getType)
	{
		getType = getType || 'all';
		var callBack = callBack || Mojo.doNothing;
		var baseURL = "http://www.google.com/reader/api/0/stream/contents/" + escape(this.id);
		var params = {method: 'get' , onSuccess: this.getArticlesSuccess.bind(this , callBack) , onFailure: this.getArticlesFailure.bind(this , callBack)};
		params.parameters = {
			n: Feeds.Preferences.getCount(),
			ck: Delicious.getTimeStamp(),
		}
		
		if (getType == 'unread')
		{
			params.parameters.xt = 'user/-/state/com.google/read';
		}
		
		params.requestHeaders = this.getRequestHeaders();
		this.ajaxRequest = new Ajax.Request(baseURL , params);
	},
	
	getArticlesSuccess: function(callBack , t)
	{
		Mojo.Log.info('getArticlesSuccess' , t.status);
		if (t.status != 200) return this.getArticlesFailure(callBack);
		try
		{
			var info = t.responseText.evalJSON();
			this.continuation = info.continuation;
			Mojo.Log.info('continuation: ' , this.continuation);
			for (var i=0; i < info.items.length; i++)
			{
				var article = new Feeds.GoogleArticle(this);
				article.load(info.items[i]);
				this.articles.push(article);
			}
			callBack(true);
		}
		catch(e)
		{
			Mojo.Log.error(Object.toJSON(e));
			return this.getArticlesFailure(callBack);
		}
		
	},
	
	getArticlesFailure: function(callBack , t)
	{
		callBack(false);
	},
	
	refreshArticles: function(callBack , getType)
	{
		getType = getType || 'all';
		var callBack = callBack || Mojo.doNothing;
		var baseURL = "http://www.google.com/reader/api/0/stream/contents/" + this.id;
		var params = {method: 'get' , onSuccess: this.refreshArticlesSuccess.bind(this , callBack) , onFailure: this.refreshArticlesFailure.bind(this , callBack)};
		params.parameters = {
			n: Feeds.Preferences.getCount(),
			ck: Delicious.getTimeStamp(),
		}
		
		if (getType == 'unread')
		{
			params.parameters.xt = 'user/-/state/com.google/read';
			this.removeAllReadArticles();
		}
		
		params.requestHeaders = this.getRequestHeaders();
		this.ajaxRequest = new Ajax.Request(baseURL , params);
	},
	
	refreshArticlesSuccess: function(callBack , t)
	{
		Mojo.Log.info('refreshArticlesSuccess' , t.status);
		if (t.status != 200) return this.refreshArticlesFailure(callBack);
		try
		{
			var info = t.responseText.evalJSON();
			for (var i=0; i < info.items.length; i++)
			{
				var article = new Feeds.GoogleArticle(this);
				article.load(info.items[i]);
				
				this.fitArticle(article);
			}
			callBack(true);
		}
		catch(e)
		{
			Mojo.Log.error(Object.toJSON(e));
			return this.getArticlesFailure(callBack);
		}
		callBack(true);
	},
	
	refreshArticlesFailure: function(callBack , t)
	{
		callBack(false);
	},
	
	
	loadMoreArticles: function(callBack , getType)
	{
		getType = getType || 'all';
		var callBack = callBack || Mojo.doNothing;
		var baseURL = "http://www.google.com/reader/api/0/stream/contents/" + this.id;
		var params = {method: 'get' , onSuccess: this.loadMoreArticlesSuccess.bind(this , callBack) , onFailure: this.loadMoreArticlesFailure.bind(this , callBack)};
		params.parameters = {
			n: Feeds.Preferences.getCount(),
			ck: Delicious.getTimeStamp(),
			c: this.continuation
		}
		
		if (getType == 'unread')
		{
			params.parameters.xt = 'user/-/state/com.google/read';
		}
		
		params.requestHeaders = this.getRequestHeaders();
		this.ajaxRequest = new Ajax.Request(baseURL , params);
	},
	
	loadMoreArticlesSuccess: function(callBack , t)
	{
		Mojo.Log.info('refreshArticlesSuccess' , t.status);
		if (t.status != 200) return this.loadMoreArticlesFailure(callBack);
		try
		{
			var info = t.responseText.evalJSON();
			this.continuation = info.continuation;
			Mojo.Log.info('continuation: ' , this.continuation);
			for (var i=0; i < info.items.length; i++)
			{
				var article = new Feeds.GoogleArticle(this);
				article.load(info.items[i]);
				
				this.fitArticle(article);
			}
			callBack(true);
		}
		catch(e)
		{
			Mojo.Log.error(Object.toJSON(e));
			return this.getArticlesFailure(callBack);
		}
		callBack(true);
	},
	
	loadMoreArticlesFailure: function(callBack , t)
	{
		callBack(false);
	},
	
	markAllAsRead: function(callBack , editToken)
	{
		callBack = callBack || Mojo.doNothing;
		editToken = editToken || false;
		
		if (!editToken)
		{
			this.manager.getEditToken(this.markAllAsRead.bind(this , callBack));
			return;
		}
		
		var baseURL = "http://www.google.com/reader/api/0/mark-all-as-read?client=PalmPre";
		var params = {method: 'post' , onSuccess: this.markAllAsReadSuccess.bind(this , callBack) , onFailure: this.markAllAsReadFailure.bind(this , callBack)};
		params.parameters = {
			ts: Delicious.getTimeStamp(),
			s: this.id ,
			t: this.title ,
			T: editToken
		};
		params.requestHeaders = this.getRequestHeaders();
		
		this._ajaxRequest = new Ajax.Request(baseURL , params);
	},
	
	markAllAsReadSuccess: function(callBack , t)
	{
		callBack = callBack || Mojo.doNothing;
		Mojo.Log.info('markAllAsReadSuccess' , t.status);
		if (t.status != 200) return this.markAllAsReadFailure(callBack);
		for (var i=0; i < this.articles.length; i++)
		{
			if (this.articles[i])
			{
				this.articles[i].decrementFeedUnreadCount();
			}
		}
		this.setUnreadCount(0);
		return callBack(true);
	},
	
	markAllAsReadFailure: function(callBack ,t)
	{
		callBack = callBack || Mojo.doNothing;
		return callBack(false);
	},
	
	fitArticle: function(article)
	{
		if (this.articles.length == 0)
		{
			return this.articles.push(article);
		}
		
		var aid = article.published;
		var fid = this.articles[0].published;
		var lid = this.articles[this.articles.length - 1].published;
		if (aid > fid)
		{
			this.articles.unshift(article);
		}
		else if (lid > aid)
		{
			this.articles.push(article);
		}
	},
	
	resetArticles: function()
	{
		this.continuation = false;
		this.articles = [];
	},
	
	removeAllReadArticles: function()
	{
		var articles = [];
		for(var i=0; i < this.articles.length; i++)
		{
			if (this.articles && this.articles[i] && !this.articles[i].hasBeenRead())
			{
				articles.push(this.articles[i]);
			}
		}
		
		this.articles = articles;
	}
	
});