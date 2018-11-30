Ext.define('StoryFeatureCard', {
    extend: 'Rally.ui.cardboard.Card',
    alias: 'widget.storyfeaturecard',
    hidden: false,

    // TODO Hide this monkey if it shares the same column and row attribute of
    // an already rendered card

    initComponent: function() {
        this.hidden = this.isHiddenFunc(this);
        this.callParent(arguments);
    }
});
