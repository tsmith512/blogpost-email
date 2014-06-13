function batchArchive() {
  // Process up to 100 threads at once. GmailApp.modeThreadsToArchive
  // will not accept more than 100 threads at a time.
  var batchSize = 100;
  
  // We'll archive anything matching these searches
  var searches = [
    // General Stuff:
    'in:inbox label:~-whereabouts older_than:1d',
    'in:inbox label:~-calendaring older_than:3d',
    '(in:inbox label:~-watercooler) AND ((is:read older_than:7d) OR (is:unread older_than:21d))',
    '(in:inbox label:~-announcements) AND ((is:read older_than:14d) OR (is:unread older_than:1m))',
    
    // Services Updates (timely; probably seen in-application)
    '(in:inbox) AND (label:~-docs OR label:~-jira OR label:~-confluence OR label:~-notable OR label:~-harvest) AND ((is:read older_than:1d) OR (is:unread older_than:3d))',
    'in:inbox label:~-hipchat older_than:1d',
    
    // Catch all, don't keep anything stale:
    'in:inbox is:read older_than:2m'
  ];

  for (i = 0; i < searches.length; i++) {
    // Run the search, EXLUDING anything that is starred:
    var threads = GmailApp.search(searches[i] + ' AND (-is:starred)');
    
    // Batch through the results to archive:
    for (j = 0; j < threads.length; j+=batchSize) {
      GmailApp.moveThreadsToArchive(threads.slice(j, j+batchSize));
    }
  }
  
  // Gmail claims to support -is:starred, but it doesn't work. Sometimes
  // (but not always) the "AND (-is:starred)" we included above still includes
  // starred conversations. Don't want to auto-archive those. (Or restore any
  // I accidentally archived...)
  var threads = GmailApp.search('-in:inbox is:starred');
  for (k = 0; k < threads.length; k+=batchSize) {
    GmailApp.moveThreadsToInbox(threads.slice(j, j+batchSize));
  }
}