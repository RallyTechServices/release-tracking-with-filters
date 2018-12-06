Ext.define('Constants', {
    statics: {
        FEATURE_FETCH: ['FormattedID', 'Name', 'PercentDoneByStoryCount', 'PercentDoneByStoryPlanEstimate', 'Project', 'DisplayColor'],
        STORIES_FETCH: ['FormattedID', 'Name', 'Iteration', 'Project', 'StartDate', 'EndDate'],
        STORY_COLUMNS: ['FormattedID', 'Name', 'PlanEstimate', 'ScheduleState'],
        RELEASE_CONTROL_LABEL: 'Release Tracking',
        RELEASE_CONTROL_LABEL_CLASS: 'ts-page-label',
        UNSCHEDULED: 'Unscheduled',
        START_DATE: 'Iterations from',
        END_DATE: 'to'
    }
})
