/* global Ext */
Ext.define('FeatureStoriesDependenciesPopover', {
    extend: Rally.ui.popover.DependenciesPopover,

    titleIconCls: null,
    title: 'Stories With Dependencies',

    constructor: function(config) {
        var numPredecessors = 0,
            numSuccessors = 0;
        _.each(config.stories, function(story) {
            var predecessorsAndSuccessors = story.get('PredecessorsAndSuccessors');
            if (predecessorsAndSuccessors) {
                numPredecessors += predecessorsAndSuccessors.Predecessors;
                numSuccessors += predecessorsAndSuccessors.Successors;
            }
            if (numPredecessors || numSuccessors) {
                return false; // No need to keep counting
            }
        }, this);

        config.items = [{
            xtype: 'tabpanel',
            activeTab: numPredecessors === 0 && numSuccessors > 0 ? 1 : 0,
            items: [{
                    title: 'Predecessors',
                    html: 'Loading...',
                    tabConfig: {
                        width: 160
                    },
                },
                {
                    title: 'Successors',
                    html: 'Loading...',
                    tabConfig: {
                        width: 160
                    }
                }
            ],
            listeners: {
                afterRender: this._onAfterRender,
                tabChange: this._onAfterRender,
                scope: this
            }
        }];

        this.loaded = {};
        //this.callSuper(arguments);
        // Get super super method (skip the extended DependenciesPopover.constructor()
        return this.superclass.superclass['constructor'].apply(this, arguments);
    },

    _loadData: function(tabTitle) {
        var promises = _.map(this.stories, function(story) {
            return story.getCollection(tabTitle, {
                fetch: this.fetchFields[this._getType(story)],
                requester: this
            }).load().then({
                scope: this,
                success: function(records) {
                    story.get(tabTitle)['Stories'] = records;
                    return story;
                }
            })
        }, this);

        Deft.promise.Promise.all(promises).then({
            scope: this,
            success: this._onDataRetrieved
        })
    },

    _buildContent: function(stories) {
        var html = [],
            fieldName = this._getTabPanel().getActiveTab().title;

        _.each(stories, function(story) {
            story.tplType = this._getType(story);
            var dependencies = story.get(fieldName).Stories;
            if (dependencies && dependencies.length) {
                // Add a row for the story
                html.push(this.rowTpl.apply(story));
                // Add a row for each story dependency
                _.each(dependencies, function(dependentStory) {
                    dependentStory.set('_dependencyType', fieldName);
                    html.push(this.depRowTpl.apply(dependentStory))
                }, this);
            }
            else {
                // Don't show stories with no dependencies
                /*
                // Add a "None" row
                html.push(this.noneRowTpl.apply({
                    _dependencyType: fieldName
                }));
                */
            }
        }, this);

        return '<div class="outer-container">' + html.join("\n") + '</div>';
    },

    rowTpl: Ext.create('Ext.XTemplate',
        '<div class="dependency-row">',
        '<div class="identifier">',
        '{[this.getFormattedIdTemplate(values.data)]} <span class="object-name dependency-title">{[this.trimText(values.data, 40, "")]}</span>',
        '</div>',
        '<div class="status">',
        '<tpl if="this.isUserStory(values)">',
        '{[this.getScheduleState(values)]}',
        '</div>',
        '<span class="field-label">Iteration:</span> <span class="object-name iteration">{[this.trimText(values.data.Iteration, 25, "Unscheduled")]}</span>',
        '<tpl else>',
        '<div class="percent-done-wrapper">{[this.getPercentDoneByStoryCount(values)]}</div>',
        '</div>',
        '<tpl if="this.hasReleaseAttr(values.data)">',
        '<span class="field-label">Release:</span>  <span class="object-name release">{[this.trimText(values.data.Release, 25, "Unscheduled")]}</span>',
        '<tpl else>',
        '<span>&nbsp;</span>',
        '</tpl>',
        '</tpl>',
        '</div>', {
            isUserStory: function(record) {
                return record.tplType === 'hierarchicalrequirement';
            },
            getFormattedIdTemplate: function(data) {
                return Ext.create('Rally.ui.renderer.template.FormattedIDTemplate', {
                    showIcon: true,
                    showHover: false
                }).apply(data);
            },
            getScheduleState: function(record) {
                return Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate', {
                    field: record.getField('ScheduleState')
                }).apply(record.data);
            },
            getPercentDoneByStoryCount: function(record) {
                return Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryCountTemplate', {
                    field: record.getField('PercentDoneByStoryCount'),
                    record: record
                }).apply(record.data);
            },
            trimText: function(data, max, defaultValue) {
                return data && data.Name ? Ext.String.ellipsis(data.Name, max) : defaultValue;
            },
            hasReleaseAttr: function(data) {
                return data.hasOwnProperty('Release');
            }
        }
    ),

    depRowTpl: Ext.create('Ext.XTemplate',
        '<div class="dependency-row ts-dependent-story">',
        '<div class="identifier">',
        '<span class="{[this.getDependencyIconClass(values.data)]}"></span>',
        '{[this.getFormattedIdTemplate(values.data)]} <span class="object-name dependency-title">{[this.trimText(values.data, 40, "")]}</span>',
        '</div>',
        '<div class="status">',
        '<tpl if="this.isUserStory(values)">',
        '{[this.getScheduleState(values)]}',
        '</div>',
        '<span class="field-label">Iteration:</span> <span class="object-name iteration">{[this.trimText(values.data.Iteration, 25, "Unscheduled")]}</span>',
        '<tpl else>',
        '<div class="percent-done-wrapper">{[this.getPercentDoneByStoryCount(values)]}</div>',
        '</div>',
        '<tpl if="this.hasReleaseAttr(values.data)">',
        '<span class="field-label">Release:</span>  <span class="object-name release">{[this.trimText(values.data.Release, 25, "Unscheduled")]}</span>',
        '<tpl else>',
        '<span>&nbsp;</span>',
        '</tpl>',
        '</tpl>',
        '</div>', {
            getDependencyIconClass: function(record) {
                return record._dependencyType == 'Predecessors' ? 'icon-predecessor' : 'icon-successor'
            },
            isUserStory: function(record) {
                return true;
            },
            getFormattedIdTemplate: function(data) {
                return Ext.create('Rally.ui.renderer.template.FormattedIDTemplate', {
                    showIcon: true,
                    showHover: false
                }).apply(data);
            },
            getScheduleState: function(record) {
                return Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate', {
                    field: record.getField('ScheduleState')
                }).apply(record.data);
            },
            getPercentDoneByStoryCount: function(record) {
                return Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryCountTemplate', {
                    field: record.getField('PercentDoneByStoryCount'),
                    record: record
                }).apply(record.data);
            },
            trimText: function(data, max, defaultValue) {
                return data && data.Name ? Ext.String.ellipsis(data.Name, max) : defaultValue;
            },
            hasReleaseAttr: function(data) {
                return data.hasOwnProperty('Release');
            }
        }
    ),

    noneRowTpl: Ext.create('Ext.XTemplate',
        '<div class="dependency-row ts-dependent-story">',
        '<div class="identifier">',
        '<span class="{[this.getDependencyIconClass(values)]}"></span>',
        'None',
        '</div>',
        '</div>', {
            getDependencyIconClass: function(record) {
                return record._dependencyType == 'Predecessors' ? 'icon-predecessor' : 'icon-successor'
            },
        }
    ),
});
