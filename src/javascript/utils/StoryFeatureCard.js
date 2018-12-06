/* globals Ext */
Ext.define('StoryFeatureCard', {
    extend: 'Rally.ui.cardboard.Card',
    alias: 'widget.storyfeaturecard',
    hidden: false,

    // TODO Hide this monkey if it shares the same column and row attribute of
    // an already rendered card

    initComponent: function() {
        this.hidden = this.isHiddenFunc(this);
        this.callParent(arguments);
        this.feature = this.record.get('Feature');
    },

    setupPlugins: function() {
        [];
    },

    _getFeatureColor: function() {
        var artifactColorDiv = {
            tag: 'div',
            cls: 'ts-artifact-color'
        };
        if (this.feature.DisplayColor) {
            artifactColorDiv.style = {
                backgroundColor: this.feature.DisplayColor
            };
        }
        return Ext.DomHelper.createHtml(artifactColorDiv);
    },

    _buildHtml: function() {
        var html = [];
        html.push('<div class="ts-card-table-ct"><table class="ts-card-table"><tr>');

        html.push('<td class="ts-card-content">' + this._getFeatureColor() + '</td>');
        html.push('<td class="ts-card-content"><div>' + this.feature.FormattedID + '</div></td>');

        html.push('</tr></table>');
        return html.join('\n');
    }
});
