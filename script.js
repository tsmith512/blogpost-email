function autoArchive() {
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

function batchIncoming() {
  GmailApp.getUserLabelByName("Prefilter").getThreads().forEach(autoTagMessages);
}

function autoTagMessages(thread, index, threads) {
  var msg     = thread.getMessages()[0],
      subject = thread.getFirstMessageSubject(),
      to      = [msg.getTo(), msg.getCc()].join(', '),
      from    = msg.getFrom(),
      any     = [to, from].join(', ');

  // Immediate To-Do Items
  if (subject.match(/\[timely\]/i) !== null) {
    msg.star();
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }

  // Whereabouts Info (except stuff I don't care about)
  if (subject.match(/\[(whereabouts|wf\w*|ooo)\]/i) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );

    if (subject.match(/(ooo|offline|unavailable|errands)/i) === null) {
      thread.moveToArchive();
    }
  }

  // Google Calendar Stuff
  if (subject.match(/^((Updated )?Invitation|Accepted|Canceled( Event)?)\:/) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("Calendaring") ).markUnimportant();

    if (subject.indexOf('Updated') === 0) {
      thread.moveToArchive();
    }
  }

  // General Discussion
  if (subject.match(/\[.*watercooler.*\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Watercooler") );
  }
  if (subject.match(/\[(everyone|hr|announcement|people?ing)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }
  if (subject.match(/\[(Drupal(Camp|Con).*?|Event(s)?)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }
  if (subject.match(/\[(content|blog|fourword|headless|drupal).*\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Initiatives") );
  }

  // Application Notifications
  if (from == 'confluence@fourkitchens.atlassian.net') {
    thread.addLabel( GmailApp.getUserLabelByName("Confluence") );
  }
  if (from == 'jira@fourkitchens.atlassian.net') {
    thread.addLabel( GmailApp.getUserLabelByName("JIRA") );
  }
  if (from.indexOf('notableapp.com') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("Notable") ).markUnimportant();
  }
  if (from.indexOf('docs.google.com') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("Docs") ).markUnimportant();
  }
  if (from.indexOf('harvestapp.com') > -1 || subject.match(/\[(harvest|time( tracking)?|hours)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Harvest") ).markUnimportant();
  }
  if (from == 'donotreply@hipchat.com') {
    thread.addLabel( GmailApp.getUserLabelByName("HipChat") ).markUnimportant();
  }
  if (from.match(/(noreply|notifications).*\@github\.com/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("GitHub") ).markUnimportant();
  }

  // Client Discussions
  if (from.indexOf('stanford.edu') > -1 || to.indexOf('stanford.edu') > -1 || subject.match(/\[(stanford|sdor|dor|soc)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Stanford") ).markUnimportant();
  }

}