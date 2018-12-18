/* globals Ext */
Ext.define('StoryFeatureCard', {
    extend: 'Rally.ui.cardboard.Card',
    alias: 'widget.storyfeaturecard',
    hidden: false,
    lowestPiTypeName: 'Feature',

    initComponent: function() {
        this.hidden = this.isHiddenFunc(this);
        this.callParent(arguments);
        this.feature = this.record.get(this.lowestPiTypeName);
    },

    setupPlugins: function() {
        return [
            { ptype: 'rallycardpopover' },
        ];
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
        var record = this.getRecord();
        var feature = record.get(this.lowestPiTypeName);
        var html = [];
        html.push('<div class="ts-card-table-ct"><table class="ts-card-table"><tr>');

        html.push('<td class="ts-card-content">' + this._getFeatureColor() + '</td>');
        html.push('<td class="ts-card-content"><div class="field-content">' + this.feature.FormattedID + '</div></td>');
        html.push('<td class="ts-card-content"><span class="field-content UserStories icon-story"></span></td>');
        var predSuc = record.get('PredecessorsAndSuccessors')
        if (predSuc && predSuc.Count) {
            html.push('<td class="ts-card-content"><span class="field-content PredecessorsAndSuccessors icon-children"></span></td>');
        }
        var featurePred = feature.Predecessors;
        var featureSucc = feature.Successors;
        if ((featurePred && featurePred.Count) || (featureSucc && featureSucc.Count)) {
            html.push('<td class="ts-card-content"><span class="field-content FeaturePredecessorsAndSuccessors icon-predecessor"></span></td>');
        }
        html.push('</tr></table>');
        return html.join('\n');
    },

    _addListeners: function() {
        this.callParent(arguments);
        var el = this.getEl();
        var storyIcon = el.down('.UserStories')
        if (storyIcon) {
            storyIcon.on('click', function() {
                this.fireEvent('story', this);
            }, this);
        }
        var predSucIcon = el.down('.PredecessorsAndSuccessors');
        if (predSucIcon) {
            predSucIcon.on('click', function(event, target, options) {
                this.fireEvent('fieldclick', 'StoryPredecessorsAndSuccessors', this);
            }, this, {
                card: this
            });
        }
        var featurePredSucIcon = el.down('.FeaturePredecessorsAndSuccessors');
        if (featurePredSucIcon) {
            featurePredSucIcon.on('click', function() {
                this.fireEvent('fieldclick', 'FeaturePredecessorsAndSuccessors', this);
            }, this);
        }
    }
});
