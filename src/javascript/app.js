/* global Ext _ Rally Constants Deft Utils */
Ext.define("release-tracking-with-filters", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    items: [{
        id: 'left-area',
        xtype: 'panel',
        border: false,
        bodyBorder: false,
        header: {
            cls: 'ts-panel-header',
            padding: '0 0 15 0'
        },
        cls: 'grid-area',
        title: Constants.PORTFOLIO_ITEMS,
        flex: 1,
        layout: {
            type: 'vbox',
            align: 'stretch'
        },
        items: [{
            id: 'grid-area',
            xtype: 'container',
            flex: 1,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
        }]
    }, {
        id: 'right-area',
        xtype: 'container',
        flex: 2,
        type: 'vbox',
        align: 'stretch',
        overflowX: 'auto',
        overflowY: 'auto',
        padding: '0 0 0 20',
        items: [{
            id: 'date-range-area',
            xtype: 'container',
            layout: 'hbox',
            padding: '15 0 15 20',
        }, {
            id: 'board-area',
            xtype: 'container',
            flex: 1,
            type: 'vbox',
            align: 'stretch',
            overflowX: 'auto',
            overflowY: 'auto'
        }]
    }],
    config: {
        defaultSettings: {},
    },

    integrationHeaders: {
        name: "release-tracking-with-filters"
    },

    launch: function() {
        var dateRangeArea = this.down('#date-range-area');
        dateRangeArea.add([{
            xtype: 'rallydatefield',
            id: 'start-date-picker',
            fieldLabel: Constants.START_DATE,
            labelWidth: 120,
            labelCls: 'date-label',
            //minWidth: 200,
            margin: '0 10 0 0',
            listeners: {
                scope: this,
                change: function(cmp, newValue) {
                    this.timeboxStart = newValue;
                    this._update();
                }
            }
        }, {
            xtype: 'rallydatefield',
            id: 'end-date-picker',
            fieldLabel: Constants.END_DATE,
            labelWidth: 30,
            labelCls: 'date-label',
            margin: '0 10 0 0',
            listeners: {
                scope: this,
                change: function(cmp, newValue) {
                    this.timeboxEnd = newValue;
                    this._update();
                }
            }
        }]);

        var timeboxScope = this.getContext().getTimeboxScope();
        this._onTimeboxScopeChange(timeboxScope);

        var promises = [];

        // Get lowest PI type.
        promises.push(Rally.data.util.PortfolioItemHelper.getPortfolioItemTypes().then({
            scope: this,
            success: function(records) {
                this.portfolioItemTypes = records;
                this.lowestPi = this.portfolioItemTypes[0];
                this.lowestPiTypePath = this.lowestPi.get('TypePath');
                this.lowestPiTypeName = this.lowestPi.get('Name');
                this.modelNames = [this.lowestPiTypePath];
                return Rally.data.wsapi.ModelFactory.getModel({
                    type: this.lowestPiTypePath
                });
            }
        }).then({
            scope: this,
            success: function(model) {
                this.lowestPiModel = model;
            }
        }));

        // Wait for lowest pi and release selection, then update
        Deft.promise.Promise.all(promises).then({
            scope: this,
            success: this._update
        });
    },

    _update: function() {
        this.setLoading(true);

        // Something about the grid cleanup process clears plugin listeners.
        // Recreate the plugin on every update. It must be created before the
        // grid so we can use its value to build the data store.
        return this._createScopePlugin().then({
            scope: this,
            success: function(plugin) {
                this.scopeControlPlugin = plugin;
                return this._updateIterationsStore()
            }
        }).then({
            scope: this,
            success: function(iterations) {
                this.currentIterations = iterations;
                return this._updatePisStore();
            },
        }).then({
            scope: this,
            success: function(pis) {
                this._addPisGrid(this.piStore);
            }
        });
    },

    _createScopePlugin: function() {
        var deferred = Ext.create('Deft.Deferred')
        Ext.create('TsGridboardProjectScope', {
            ptype: 'tsgridboardprojectscope',
            headerPosition: 'left',
            stateful: true,
            stateId: this.getModelScopedStateId('project', 'scope'),
            listeners: {
                scope: this,
                ready: function(plugin) {
                    deferred.resolve(plugin);
                },
                select: function(newValue) {
                    this._update()
                }
            }
        });
        return deferred.promise;
    },

    setLoading: function(loading) {
        this.down('#board-area').setLoading(loading);
        if (this.grid) {
            var treegrid = this.grid.down('rallytreegrid');
            if (treegrid) {
                treegrid.setLoading(loading);
            }
        }
    },

    // Usual monkey business to size gridboards
    onResize: function() {
        this.callParent(arguments);
        var gridArea = this.down('#grid-area');
        var grid = this.down('rallygridboard');
        if (gridArea && grid) {
            grid.setHeight(gridArea.getHeight() - 30)
        }
        return;
        var boardArea = this.down('#board-area');
        var board = this.down('rallygridboard');
        if (boardArea && board) {
            board.setHeight(boardArea.getHeight())
        }
    },

    _updatePisStore: function() {
        this.currentDataContext = this.getContext().getDataContext();
        if (this.searchAllProjects()) {
            this.currentDataContext.project = null;
        }
        this.currentPiQueries = this._getPiQueries();

        return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.lowestPiTypePath],
            autoLoad: false,
            fetch: Constants.FEATURE_FETCH,
            filters: this.currentPiQueries,
            enableHierarchy: true,
            remoteSort: true,
            context: this.currentDataContext,
            enablePostGet: true,
            enableRootLevelPostGet: true,
            clearOnLoad: false
        }).then({
            scope: this,
            success: function(store) {
                this.piStore = store;
                //return this.piStore.load();
            }
        });
    },

    _getPiQueries: function() {
        var queries = [];

        switch (this.timeboxType) {
            case 'release':
                queries.push({
                    property: 'Release',
                    value: this.timebox ? this.timebox.get('_ref') : null
                });
                break;
            case 'iteration':
                if (this.timebox) {
                    queries.push({
                        property: 'UserStories.Iteration.Name',
                        value: this.timebox.get('Name')
                    });
                    queries.push({
                        property: 'UserStories.Iteration.StartDate',
                        value: this.timebox.get('StartDate')
                    });
                    queries.push({
                        property: 'UserStories.Iteration.EndDate',
                        value: this.timebox.get('EndDate')
                    });
                }
                else {
                    queries.push({
                        property: 'UserStories.Iteration',
                        value: null
                    });
                }
                break;
            case 'milestone':
                queries.push({
                    property: 'Milestones.ObjectID',
                    value: this.timebox ? this.timebox.get('ObjectID') : null
                });
                break;
            default:
                break;
        }

        return queries;
    },

    _updateIterationsStore: function() {
        var filter = Rally.data.wsapi.Filter.and([{
            property: 'EndDate',
            operator: '>=',
            value: this.timeboxStart
        }, {
            property: 'StartDate',
            operator: '<=',
            value: this.timeboxEnd
        }])
        this.iterationsStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'Iteration',
            autoLoad: false,
            filters: filter,
            context: this.getContext().getDataContext()
        });
        return this.iterationsStore.load();
    },

    _getDefects: function() {
        // TODO (tj) needed?
    },

    _addPisGrid: function(store) {
        var gridArea = this.down('#grid-area')
        if (gridArea) {
            gridArea.removeAll();
        }
        var currentModelName = this.modelNames[0];
        var allProjectsContext = this.getContext().getDataContext();
        allProjectsContext.project = null;
        this.grid = gridArea.add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: this.modelNames,
            toggleState: 'grid',
            height: gridArea.getHeight() - 30,
            listeners: {
                scope: this,
                viewchange: this._update,
                load: function(grid) {
                    this._onGridLoad(grid);
                }
            },
            plugins: [{
                    ptype: 'rallygridboardinlinefiltercontrol',
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: this.getModelScopedStateId(currentModelName, 'filters'),
                        modelNames: this.modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
                                context: allProjectsContext,
                                portfolioItemTypes: this.portfolioItemTypes,
                                modelName: this.lowestPiTypePath,
                                whiteListFields: [
                                    'Tags',
                                    'Milestones'
                                ]
                            }
                        }
                    }
                },
                {
                    ptype: 'rallygridboardfieldpicker',
                    headerPosition: 'left',
                    modelNames: this.modelNames,
                    stateful: true,
                    stateId: this.getModelScopedStateId(currentModelName, 'fields'),
                },
                this.scopeControlPlugin,
                {
                    ptype: 'rallygridboardsharedviewcontrol',
                    sharedViewConfig: {
                        stateful: true,
                        stateId: this.getModelScopedStateId(currentModelName, 'views'),
                        stateEvents: ['select', 'beforedestroy']
                    },
                }
            ],
            gridConfig: {
                shouldShowRowActionsColumn: false,
                enableBulkEdit: false,
                enableEditing: false,
                enableColumnMove: false,
                enableInlineAdd: false,
                enableRanking: true,
                store: store,
                storeConfig: {
                    context: this.currentDataContext,
                    filters: this.currentPiQueries
                },
                listeners: {
                    scope: this,
                    itemclick: function(grid, record, item, index) {
                        // Ignore clicks on non root items
                        if (record.get('_type') == this.lowestPiTypePath.toLowerCase()) {
                            this._onPiSelected(record);
                        }
                    }
                }
            }
        });
    },

    _onGridLoad: function(grid) {
        var store = grid.getGridOrBoard().getStore();
        var root = store.getRootNode();
        var queries = _.map(root.childNodes, function(pi) {
            return {
                property: this.lowestPiTypeName,
                operator: '=',
                value: pi.get('_ref')
            }
        }, this);
        // If there are no PIs, then explicitly filter out all stories
        this.storiesFilter = Rally.data.wsapi.Filter.or(queries) || [{
            property: 'ObjectID',
            value: 0
        }];

        var boardPromise = this._addPisBoard(this.storiesFilter, this.currentIterations).then({
            scope: this,
            success: function() {
                this.setLoading(false);
            }
        });
        return boardPromise;
    },

    _onPiSelected: function(pi) {
        var filter;
        if (this.selectedPi == pi) {
            // Unselecting the pi
            filter = this.storiesFilter;
            delete this.selectedPi;
        }
        else {
            this.selectedPi = pi;
            filter = Rally.data.wsapi.Filter({
                property: this.lowestPiTypeName,
                operator: '=',
                value: pi.get('_ref')
            });
        }
        this.buckets = {};
        this.board.refresh({
            storeConfig: {
                filters: filter
            }
        });
    },

    _addPisBoard: function(filter, iterations) {
        var boardDeferred = Ext.create('Deft.Deferred');
        var boardArea = this.down('#board-area')
        boardArea.removeAll();

        this.buckets = {};

        var context = this.getContext();
        var dataContext = context.getDataContext();

        // Create a column for each iteration shared by the projects
        var endDateSorted = _.sortBy(iterations, function(i) {
            return i.get('EndDate');
        });
        var uniqueIterations = _.unique(endDateSorted, function(i) {
            return this._getIterationKey(i)
        }, this);

        var columns = _.map(uniqueIterations, function(iteration) {
            var startDate = iteration.get('StartDate').toLocaleDateString();
            var endDate = iteration.get('EndDate').toLocaleDateString();
            var headerTemplate = new Ext.XTemplate('<div class="iteration-name">{name}</div><div class="iteration-dates">{start} - {end}</dev>').apply({
                name: iteration.get('Name'),
                start: startDate,
                end: endDate
            });
            return {
                xtype: 'rallycardboardcolumn',
                //value: iteration.get('Name'),
                columnHeaderConfig: {
                    headerTpl: headerTemplate,
                    cls: 'cardboard-column-header'
                },
                fields: ['Feature'],
                additionalFetchFields: Constants.STORIES_FETCH,
                getStoreFilter: function() {
                    // Don't return this column 'value' as a filter
                    return [{
                            property: 'Iteration.Name',
                            value: iteration.get('Name')
                        },
                        {
                            property: 'Iteration.StartDate',
                            value: iteration.get('StartDate')
                        },
                        {
                            property: 'Iteration.EndDate',
                            value: iteration.get('EndDate')
                        }
                    ];
                },
                isMatchingRecord: function(record) {
                    return true;
                }
            }
        }, this);
        // Add a column for unscheduled stories
        columns.push({
            xtype: 'rallycardboardcolumn',
            value: null,
            columnHeaderConfig: {
                headerTpl: Constants.UNSCHEDULED
            },
            fields: ['Feature'],
            additionalFetchFields: Constants.STORIES_FETCH
        });

        this.board = boardArea.add({
            xtype: 'rallycardboard',
            type: ['HierarchicalRequirement'],
            attribute: 'Iteration',
            //height: boardArea.getHeight(),
            storeConfig: {
                filters: filter,
                fetch: 'Feature',
                groupField: 'Feature',
                context: this.currentDataContext
            },
            listeners: {
                scope: this,
                boxready: function() {
                    boardDeferred.resolve()
                }
            },
            rowConfig: {
                field: 'Project'
            },
            columns: columns,
            cardConfig: {
                xtype: 'storyfeaturecard',
                isHiddenFunc: this._isCardHidden.bind(this),
                listeners: {
                    scope: this,
                    select: function(card) {
                        var story = card.getRecord();
                        var featureRef = story.get(this.lowestPiTypeName);
                        var feature = this.piStore.getById(featureRef);
                        var context = this.getContext().getDataContext();
                        context.project = story.get('Project')._ref;
                        var iteration = story.get('Iteration');
                        var filters = [];
                        if (iteration) {
                            filters = [{
                                property: 'Iteration.Name',
                                value: iteration.Name
                            }, {
                                property: 'Iteration.StartDate',
                                value: iteration.StartDate
                            }, {
                                property: 'Iteration.EndDate',
                                value: iteration.EndDate
                            }];
                        }
                        else {
                            filters = [{
                                property: 'Iteration',
                                value: null
                            }];
                        }
                        Rally.ui.popover.PopoverFactory.bake({
                            field: 'UserStory',
                            record: feature,
                            target: card.getEl(),
                            context: context,
                            listViewConfig: {
                                gridConfig: {
                                    storeConfig: {
                                        filters: filters
                                    },
                                    columnCfgs: Constants.STORY_COLUMNS,
                                }
                            }
                        });
                    },
                }
            }
        });
        return boardDeferred.promise;
    },

    _getCardBucketKey: function(card) {
        var record = card.getRecord();
        var iterationId = null;
        var iterationKey = this._getIterationKey(record.get('Iteration'));
        var projectId = record.get('Project').ObjectID;
        var featureId = record.get('Feature').ObjectID;
        return [featureId, projectId, iterationKey].join('-');
    },

    _getIterationKey: function(iteration) {
        var result = '';
        if (iteration) {
            if (iteration.get) {
                result = iteration.get('Name') + iteration.get('StartDate').toISOString() + iteration.get('EndDate').toISOString();
            }
            else {
                result = iteration.Name + iteration.StartDate + iteration.EndDate;
            }
        }
        return result;
    },


    _isCardHidden: function(card) {
        var result = false;
        var key = this._getCardBucketKey(card);
        if (this.buckets.hasOwnProperty(key)) {
            result = true;
        }
        else {
            this.buckets[key] = this;
        }
        return result;
    },

    viewChange: function() {
        this._buildGridStore();
    },

    getModelScopedStateId: function(modelName, id) {
        return this.getContext().getScopedStateId(modelName + '-' + id);
    },

    getHeight: function() {
        var el = this.getEl();
        if (el) {
            var height = this.callParent(arguments);
            return Ext.isIE8 ? Math.max(height, 600) : height;
        }

        return 0;
    },

    setHeight: function(height) {
        this.callParent(arguments);
        if (this.grid) {
            this.grid.setHeight(height);
        }
        if (this.board) {
            this.board.setHeight(height);
        }
    },

    getSettingsFields: function() {
        return [{
            xtype: 'container'
        }];
    },

    searchAllProjects: function() {
        return this.scopeControlPlugin.getValue()
    },

    onTimeboxScopeChange: function(newTimeboxScope) {
        this.callParent(arguments);
        this._onTimeboxScopeChange(newTimeboxScope);
        this._update();
    },

    _onTimeboxScopeChange: function(timeboxScope) {
        if (timeboxScope) {
            this.timeboxType = timeboxScope.getType();
            this.timebox = timeboxScope.getRecord();
            if (this.timeboxType == 'release') {
                this.timeboxStart = this.timebox ? this.timebox.get('ReleaseStartDate') : new Date();
                this.timeboxEnd = this.timebox ? this.timebox.get('ReleaseDate') : new Date();
            }
            else if (this.timeboxType == 'milestone') {
                this.timeboxStart = this.timebox ? this.timebox.get('TargetDate') : new Date();
                this.timeboxEnd = this.timebox ? this.timebox.get('TargetDate') : new Date();
            }
            else if (this.timeboxType == 'iteration') {
                this.timeboxStart = this.timebox ? this.timebox.get('StartDate') : new Date();
                this.timeboxEnd = this.timebox ? this.timebox.get('EndDate') : new Date();
            }
        }
        else {
            this.timeboxStart = new Date();
            this.timeboxEnd = new Date();
        }

        this._updateDateControls();
    },

    _updateDateControls: function() {
        var startDatePicker = this.down('#start-date-picker');
        startDatePicker.suspendEvents();
        startDatePicker.setValue(this.timeboxStart);
        startDatePicker.resumeEvents();
        var endDatePicker = this.down('#end-date-picker');
        endDatePicker.suspendEvents();
        endDatePicker.setValue(this.timeboxEnd);
        endDatePicker.resumeEvents();
    }
});
