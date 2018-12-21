Ext.define('TsExportGrid', {

    extend: 'Ext.Component',

    getExportMenuItems: function() {
        var result = [];
        var models = [this.model];
        result = [{
            text: 'Export Portfolio Items...',
            handler: this._export,
            scope: this,
            childModels: models
        }, {
            text: 'Export Portfolio Items and User Stories...',
            handler: this._export,
            scope: this,
            childModels: models.concat(['hierarchicalrequirement'])
        }, {
            text: 'Export Portfolio Items, User Stories and Tasks...',
            handler: this._export,
            scope: this,
            childModels: models.concat(['hierarchicalrequirement', 'task'])
        }, {
            text: 'Export Portfolio Items and Child Items...',
            handler: this._export,
            scope: this,
            childModels: models.concat(['hierarchicalrequirement', 'task', 'defect', 'testcase'])
        }];

        return result;
    },

    _getGrid: function() {
        return Rally.getApp().down('#' + this.gridId);
    },

    _export: function(args) {
        var columns = this._getExportColumns(),
            fetch = this._getExportFetch(),
            filters = this._getExportFilters(),
            modelName = this.model,
            childModels = args.childModels,
            sorters = this._getExportSorters();

        var exporter = Ext.create('Rally.technicalservices.HierarchyExporter', {
            modelName: modelName,
            fileName: 'hierarchy-export.csv',
            columns: columns,
            portfolioItemTypeObjects: this.portfolioItemTypes

        });
        exporter.on('exportupdate', this._showStatus, this);
        exporter.on('exporterror', this._showError, this);
        exporter.on('exportcomplete', this._showStatus, this);

        var hierarchyLoader = Ext.create('Rally.technicalservices.HierarchyLoader', {
            model: modelName,
            fetch: fetch,
            filters: filters,
            sorters: sorters,
            loadChildModels: childModels,
            portfolioItemTypes: this.portfolioItemTypes,
            context: this.dataContext
        });
        hierarchyLoader.on('statusupdate', this._showStatus, this);
        hierarchyLoader.on('hierarchyloadartifactsloaded', exporter.setRecords, exporter);
        hierarchyLoader.on('hierarchyloadcomplete', exporter.export, exporter);
        hierarchyLoader.on('hierarchyloaderror', this._showError, this)
        hierarchyLoader.load();
    },
    _getExportColumns: function() {
        var grid = this._getGrid();
        if (grid) {
            return _.filter(grid.getGridOrBoard().columns, function(item) {
                return (
                    item.dataIndex &&
                    item.dataIndex != "DragAndDropRank" &&
                    item.xtype &&
                    item.xtype != "rallytreerankdraghandlecolumn" &&
                    item.xtype != "rallyrowactioncolumn" &&
                    item.text != "&#160;");
            });
        }
        return [];
    },
    _getExportFilters: function() {
        var grid = this._getGrid(),
            filters = [],
            query = Rally.getApp().getSetting('query');

        if (grid.currentCustomFilter && grid.currentCustomFilter.filters) {
            // Concat any current custom filters (don't assign as we don't want to modify the currentCustomFilter array)
            filters = filters.concat(grid.currentCustomFilter.filters);
        }

        if (query) {
            filters.push(Rally.data.wsapi.Filter.fromQueryString(query));
        }

        var timeboxScope = this.context.getTimeboxScope();
        if (timeboxScope && timeboxScope.isApplicable(grid.getGridOrBoard().store.model)) {
            filters.push(timeboxScope.getQueryFilter());
        }

        return filters;
    },
    _getExportFetch: function() {
        var fetch = _.pluck(this._getExportColumns(), 'dataIndex');
        if (Ext.Array.contains(fetch, 'TaskActualTotal')) {
            fetch.push('Actuals');
        }
        return fetch;
    },
    _getExportSorters: function() {
        var grid = this._getGrid();
        if (grid) {
            return grid.getGridOrBoard().getStore().getSorters();
        }
    },

    _showError: function(msg) {
        Rally.ui.notify.Notifier.showError({ message: msg });
    },
    _showStatus: function(message) {
        if (message) {
            Rally.ui.notify.Notifier.showStatus({
                message: message,
                showForever: true,
                closable: false,
                animateShowHide: false
            });
        }
        else {
            Rally.ui.notify.Notifier.hide();
        }
    },
});
