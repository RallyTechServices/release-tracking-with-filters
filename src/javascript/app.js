/* global Ext _ Rally Constants Deft */
Ext.define("release-tracking-with-filters", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [{
        id: 'controls-area',
        xtype: 'container',
        layout: {
            type: 'hbox'
        }
    }, {
        id: 'data-area',
        xtype: 'container',
        flex: 1,
        layout: {
            type: 'hbox',
            align: 'stretch'
        },
        items: [{
            id: 'grid-area',
            xtype: 'container',
            flex: 1,
            type: 'vbox',
            align: 'stretch'
        }, {
            id: 'board-area',
            xtype: 'container',
            flex: 2,
            type: 'vbox',
            align: 'stretch',
            overflowX: 'auto',
            overflowY: 'auto'
        }]
    }],
    config: {
        defaultSettings: {}
    },

    integrationHeaders: {
        name: "release-tracking-with-filters"
    },

    launch: function() {
        var releasePickerDeferred = Ext.create('Deft.Deferred');

        this.down('#controls-area').add({
            xtype: 'rallyreleasecombobox',
            id: 'release-picker',
            fieldLabel: Constants.RELEASE_CONTROL_LABEL,
            labelCls: Constants.RELEASE_CONTROL_LABEL_CLASS,
            valueField: '_ref',
            labelWidth: 150,
            width: 500,
            stateful: true,
            stateId: Rally.getApp().getContext().getScopedStateId('release-picker'),
            listeners: {
                scope: this,
                select: this._onReleaseSelect,
                ready: function(cmp) {
                    this.selectedRelease = cmp.getRecord();
                    releasePickerDeferred.resolve();
                }
            }
        })

        var promises = [releasePickerDeferred.promise];

        // Get lowest PI type.
        promises.push(Rally.data.util.PortfolioItemHelper.getPortfolioItemTypes().then({
            scope: this,
            success: function(records) {
                this.lowestPi = records[0];
                this.lowestPiTypePath = this.lowestPi.get('TypePath');
                this.lowestPiTypeName = this.lowestPi.get('Name');
                this.modelNames = [this.lowestPiTypePath];
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

        var iterationsPromise = this._updateIterationsStore().then({
            scope: this,
            success: function(iterations) {
                this.currentIterations = iterations;
            },
        });

        var pisPromise = this._updatePisStore().then({
            scope: this,
            success: function(pis) {
                this._addPisGrid(this.piStore);
                var queries = _.map(pis, function(pi) {
                    return {
                        property: this.lowestPiTypeName,
                        operator: '=',
                        value: pi.get('_ref')
                    }
                }, this);
                this.storiesFilter = Rally.data.wsapi.Filter.or(queries) || [];
            }
        });

        Deft.promise.Promise.all([iterationsPromise, pisPromise]).then({
            scope: this,
            success: function() {
                return this._addPisBoard(this.storiesFilter, this.currentIterations);
            }
        });
    },

    setLoading: function(loading) {
        this.down('#data-area').setLoading(loading);
    },

    _onReleaseSelect: function(cmp) {
        this.selectedRelease = cmp.getRecord();
        this._update();
    },

    // Usual monkey business to size gridboards
    onResize: function() {
        this.callParent(arguments);
        var gridArea = this.down('#grid-area');
        var grid = this.down('rallygridboard');
        if (gridArea && grid) {
            grid.setHeight(gridArea.getHeight())
        }
        var boardArea = this.down('#board-area');
        var board = this.down('rallygridboard');
        if (gridArea && board) {
            board.setHeight(boardArea.getHeight())
        }
    },

    _updatePisStore: function() {
        var dataContext = this.getContext().getDataContext();
        var releaseFilters = [{
            property: 'Release',
            value: this.selectedRelease.get('_ref')
        }];
        return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: [this.lowestPiTypePath],
            autoLoad: false,
            fetch: Constants.FEATURE_FETCH,
            filters: releaseFilters,
            enableHierarchy: true,
            remoteSort: true,
            context: dataContext,
            enablePostGet: true,
            enableRootLevelPostGet: true,
            clearOnLoad: false
        }).then({
            scope: this,
            success: function(store) {
                this.piStore = store;
                return this.piStore.load();
            }
        });
    },

    _updateIterationsStore: function() {
        var filter = Rally.data.wsapi.Filter.and([{
            property: 'EndDate',
            operator: '>',
            value: this.selectedRelease.get('ReleaseStartDate')
        }, {
            property: 'StartDate',
            operator: '<',
            value: this.selectedRelease.get('ReleaseDate')
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
        gridArea.removeAll();

        var currentModelName = this.modelNames[0];

        var context = this.getContext();
        var dataContext = context.getDataContext();

        var releaseFilters = [{
            property: 'Release',
            value: this.selectedRelease.get('_ref')
        }];

        this.grid = gridArea.add({
            xtype: 'rallygridboard',
            context: context,
            modelNames: this.modelNames,
            toggleState: 'grid',
            height: gridArea.getHeight(),
            listeners: {
                scope: this,
                viewchange: this.viewChange,
            },
            plugins: [{
                    ptype: 'rallygridboardinlinefiltercontrol',
                    inlineFilterButtonConfig: {
                        stateful: true,
                        stateId: this.getModelScopedStateId(currentModelName, 'filters'),
                        modelNames: this.modelNames,
                        inlineFilterPanelConfig: {
                            quickFilterPanelConfig: {
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
                store: store,
                storeConfig: {
                    context: dataContext,
                    filters: releaseFilters,
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
        this.setLoading(false);
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
        this.board.refresh({
            storeConfig: {
                filters: filter
            }
        });
    },

    _addPisBoard: function(filter, iterations) {
        var boardArea = this.down('#board-area')
        boardArea.removeAll();

        var context = this.getContext();
        var dataContext = context.getDataContext();

        // Create a column for each iteration
        var columns = _.map(iterations, function(iteration) {
            return {
                xtype: 'rallycardboardcolumn',
                value: iteration.get('_ref'),
                columnHeaderConfig: {
                    headerTpl: iteration.get('Name')
                },
                fields: [
                    'Feature'
                ]
            }
        }, this);
        columns.push({
            xtype: 'rallycardboardcolumn',
            value: null,
            columnHeaderConfig: {
                headerTpl: Constants.UNSCHEDULED
            },
            fields: [
                'Feature'
            ],
        })

        this.board = boardArea.add({
            xtype: 'rallycardboard',
            type: ['HierarchicalRequirement'],
            attribute: 'Iteration',
            height: boardArea.getHeight(),
            storeConfig: {
                filters: filter,
                fetch: 'Feature',
                groupField: 'Feature'
            },
            rowConfig: {
                field: 'Project'
            },
            columns: columns,
            cardConfig: {
                xtype: 'storyfeaturecard'
            }

        })
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
    }
});
