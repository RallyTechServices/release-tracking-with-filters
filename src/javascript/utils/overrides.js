// Remove 'Actuals' from the blacklist
Ext.override(Rally.ui.gridboard.plugin.GridBoardFieldPicker, {
    gridFieldBlackList: [
        // 'Actuals',
        'Changesets',
        'Children',
        // 'Description',
        // 'Notes',
        'ObjectID',
        'Predecessors',
        'RevisionHistory',
        'Subscription',
        'Successors',
        'TaskIndex',
        'Workspace',
        'VersionId'
    ]
});

Ext.override(Rally.ui.inlinefilter.PropertyFieldComboBox, {
    /**
     * @cfg {String[]} whiteListFields
     * field names that should be included from the filter row field combobox
     */
    defaultWhiteListFields: ['Milestones', 'Tags']
});

/**
 * Remove the buffer when responding to 'viewstatesave' events
 */
Ext.override(Rally.ui.gridboard.SharedViewComboBox, {
    initComponent: function() {
        this.callParent(arguments);
        this.cmp.un('viewstatesave', this._onCmpViewStateSave, this);
        this.cmp.on('viewstatesave', this._onCmpViewStateSave, this);
    },
});
