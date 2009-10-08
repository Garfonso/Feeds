MainAssistant = Class.create(Delicious.Assistant , {
	
	initialize: function()
	{
		this.model = {listTitle: 'Feeds' , items: []};
		this.attributes = { itemTemplate: "main/feedItem" , listTemplate: "main/list" ,
             				swipeToDelete: true , reorderable: false , renderLimit: 500 };
        this.createListeners();
	},
	
	createListeners: function()
	{
		this.addNewFeed = this.addNewFeed.bindAsEventListener(this);
		this.listTapHandler = this.listTapHandler.bindAsEventListener(this);
		this.listDeleteHandler = this.listDeleteHandler.bindAsEventListener(this);
		this._refreshCounts = this.refreshCounts.bindAsEventListener(this);
	},
	
	setup: function()
	{
		this.addIcon = this.controller.get('addIcon');
		if (!Feeds.Manager)
		{
			Feeds.Manager = new Feeds.FeedManager();
		}
		this.controller.setupWidget('feedsList' , this.attributes , this.model);
		this.showLoader();
		
		
		var appMenu = this.getAppMenu();
		appMenu.push({label: $L('Mark All As Read') , command: "markAllAsRead"});
		this.controller.setupWidget(Mojo.Menu.appMenu , {} , {visible: true , items: appMenu});
		
		if (Feeds.GoogleAccount.isLoggedIn())
		{
			this.manager = Feeds.GoogleAccount.getManager();
			var loginInfo = Feeds.GoogleAccount.getLogin();
			this.manager.login(loginInfo.email , loginInfo.password , this.getAllFeeds.bind(this));
		}
		else
		{
			this.hideLoader();
		}
	},
	
	activate: function(o)
	{
		var o = o || {};
		this.activateScrollTop();
		this.addIcon.observe(Mojo.Event.tap , this.addNewFeed);
		
		var appIcon = this.controller.get('appIcon');
		if (appIcon)
		{
			appIcon.observe('click' , this._refreshCounts);
		}
		
		
		if (o.refresh)
		{
			this.refreshList();
		}
		
		if (o.refreshCounts)
		{
			this.refreshCounts();
		}
		
		if (o.fullRefresh)
		{
			this.fullRefreshList();
		}
		
		var feedsList = this.controller.get('feedsList');
		if (feedsList)
		{
			feedsList.observe(Mojo.Event.listTap , this.listTapHandler);
			feedsList.observe(Mojo.Event.listDelete , this.listDeleteHandler);
		}
		
		this.countChanged();
	},
	
	deactivate: function()
	{
		this.deactivateScrollTop();
		this.addIcon.stopObserving(Mojo.Event.tap , this.addNewFeed);
		var feedsList = this.controller.get('feedsList');
		if (feedsList)
		{
			feedsList.stopObserving(Mojo.Event.listDelete , this.listDeleteHandler);
			feedsList.stopObserving(Mojo.Event.listTap , this.listTapHandler);
		}
		
		var appIcon = this.controller.get('appIcon');
		if (appIcon)
		{
			appIcon.stopObserving(Mojo.Event.tap , this._refreshCounts);
		}
	},
	
	cleanup: function()
	{
		
	},
	
	handleCommand: function(event)
	{
		if (event.type == Mojo.Event.command) 
		{
			switch (event.command) 
			{
				case "markAllAsRead":
					return window.setTimeout(this.markAllAsRead.bind(this) , 50); // this prevents the stutter of the appmenu when going up.
				break;
			}
		}
		this.doHandleCommand(event);
	},
	
	listTapHandler: function(event)
	{
		var item = event.item;
		if (item.isFolder)
		{
			this.controller.stageController.pushScene('view-folder' , {'folder': item});
		}
		else
		{
			this.controller.stageController.pushScene('view-feed' , {'feed': item});
		}
	},
	
	listDeleteHandler: function(event)
	{
		var item = event.item;
		if (item)
		{
			this.showLoading();
			this.manager.deleteFeed(item , this.deleteFeedCallBack.bind(this));
		}
	},
	
	fullRefreshList: function()
	{
		this.controller.stageController.swapScene({name: 'main' , transition: Mojo.Transition.crossFade});
	},
	
	refreshList: function()
	{
		this.getFeeds();
	},
	
	refreshCounts: function(e)
	{
		if (this._isRefreshing) return;
		
		if (Feeds.GoogleAccount.isLoggedIn() && this.manager.display.length === 0)
		{
			this.showLoader();
			this.manager = Feeds.GoogleAccount.getManager();
			var loginInfo = Feeds.GoogleAccount.getLogin();
			this.manager.login(loginInfo.email , loginInfo.password , this.getAllFeeds.bind(this));
		}
		else
		{
			this.showSmallLoader();
			this._isRefreshing = true;
			this.manager.updateUnreadCount(this.refreshCountsCallBack.bind(this));
		}
	},
	
	refreshCountsCallBack: function(worked)
	{
		this._isRefreshing = false;
		this.hideSmallLoader();
		if (!worked)
		{
			this.errorDialog(Feeds.Message.Error.getUnreadCounts);
		}
		this.countChanged();
	},
	
	modelChanged: function()
	{
		this.controller.modelChanged(this.model);
	},
	
	countChanged: function()
	{
		if (this.manager)
		{
			this.model.items = this.manager.getDisplayItems();
			this.modelChanged();
		}
	},
	
	getFeeds: function()
	{
		Feeds.Manager.getFeeds(this.getFeedsCallBack.bind(this));
	},
	
	getFeedsCallBack: function(response)
	{
		this.hideLoader();
		if (response.success)
		{
			this.model.items = response.feeds;
			this.modelChanged();
		}
	},
	
	addNewFeed: function()
	{
		this.controller.stageController.pushScene('add-feed' , {manager: this.manager});
	},
	
	getAllFeeds: function(t)
	{
		if (!t) return;
		this.manager.getAllFeedsList(this.getAllFeedsCallBack.bind(this));
	},
	
	getAllFeedsCallBack: function(success)
	{
		if (success)
		{
			this.model.items = this.manager.getDisplayItems();
			this.modelChanged();
			this.manager.updateUnreadCount(this.countChanged.bind(this));
		}
		else
		{
			this.errorDialog("Unable to load feeds from Google Reader.");
		}
		this.hideLoader();
	},
	
	markAllAsRead: function()
	{
		this.manager.markAllAsRead(this.markAllAsReadCallBack.bind(this));
		if (this._isRefreshing) return;
		
		this.showSmallLoader();
		this._isRefreshing = true
	},
	
	markAllAsReadCallBack: function(finished)
	{
		this._isRefreshing = false;
		
		if (finished)
		{
			window.setTimeout(this.refreshCounts.bind(this) , 350);
		}
		else
		{
			this.hideSmallLoader();
			this.errorDialog('Unable to mark all as read.');
		}
	},
	
	deleteFeedCallBack: function(worked)
	{
		this.hideLoading();
		if (!worked)
		{
			this.errorDialog('Unable to delete feed from Google Reader.');
		}
		this.countChanged();
	},
	
	showSmallLoader: function()
	{
		if (!this._smallLoader)
		{
			this._smallLoader = new Element('div' , {className:"smallLoader overIcon"});
		}
		
		if (!this._smallLoader.parentNode)
		{
			this.controller.sceneElement.appendChild(this._smallLoader);
		}
		this._smallLoader.show();
		var appIcon = this.controller.get('appIcon');
		if (appIcon)
		{
			appIcon.hide();
		}
	},
	
	hideSmallLoader: function()
	{
		this._smallLoader.remove();
		var appIcon = this.controller.get('appIcon');
		if (appIcon)
		{
			appIcon.show();
		}
	}
	
	
});