Ext.define('TsGridboardProjectScope', {
    alias: 'plugin.tsgridboardprojectscope',
    extend: 'Ext.AbstractPlugin',
    mixins: ['Rally.ui.gridboard.plugin.GridBoardControlShowable'],

    init: function(cmp) {
        this.callParent(arguments);
        this.cmp = cmp;

        this.showControl();
    },
    getControlCmpConfig: function() {
        return _.merge({
            xtype: 'rallycombobox',
            id: 'ignoreScopeControl',
            stateful: true,
            stateId: this.cmp.getContext().getScopedStateId('TsGridboardProjectScope'),
            stateEvents: ['select'],
            displayField: 'text',
            valueField: 'value',
            // Don't set initial value with this component or it will override the state
            storeConfig: {
                fields: ['text', 'value'],
                data: [{
                    text: "In Current Project(s)",
                    value: false
                }, {
                    text: "In Any Project",
                    value: true
                }]
            }
        }, this.controlConfig);
    }
});
