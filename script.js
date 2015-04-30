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

  // Remove the prefilter label, then check to see if there are multiple
  // messages in this thread. If so, it's just a new email on an existing
  // thread and we can stop.
  thread.removeLabel( GmailApp.getUserLabelByName("Prefilter") );
  // if (thread.getMessageCount() > 1) { return; }

  // Immediate To-Do Items (either "Timely" or a bracket code in all caps that is longer than just a couple letters, which may be a client abbreviation)
  if (subject.match(/\[timely\]/i) !== null || subject.match(/\[[A-Z ]{5,}\]/) || subject.match(/\[office\]/i)) {
    msg.star();
    thread.addLabel( GmailApp.getUserLabelByName("~/Announcements") );
  }

  // Whereabouts Info (except stuff I don't care about)
  if (subject.match(/(whereabouts|\[.*wf.*\]|ooo|offline)/i) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Whereabouts") );

    // Most of this is just "I'm working at home today", but this may be
    // a poorly-imagined idea... We'll see...
    if (subject.match(/(ooo|offline|unavailable|errands)/i) === null) {
      thread.moveToArchive();
    }
  }

  // Google Calendar Stuff
  if (subject.match(/^((Updated )?Invitation|Accepted|Canceled( Event)?)\:/) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Calendaring") ).markUnimportant();

    if (subject.indexOf('Updated') === 0) {
      thread.moveToArchive();
    }
  }

  // General Discussion
  if (subject.match(/\[.*watercooler.*\]/i) || subject.match(/\[(off topic|misc|games|not work)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Watercooler") );
  }
  if (subject.match(/\[(everyone|hr|announcement|people?ing)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Announcements") );
  }
  if (subject.match(/\[(Drupal(Camp|Con).*?|Event(s)?)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Announcements") );
  }
  if (subject.match(/\[(content|blog|headless|drupal|4k ?labs).*\]/i) || subject.match(/four ?word/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Initiatives") );
  }

  // Application Notifications
  if (from == 'confluence@fourkitchens.atlassian.net') {
    thread.addLabel( GmailApp.getUserLabelByName("~/Confluence") );
  }
  else if (from == 'jira@fourkitchens.atlassian.net' || subject.match(/\[JIRA\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/JIRA") );
  }
  else if (from.indexOf('notableapp.com') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Notable") ).markUnimportant();
  }
  else if (from.indexOf('docs.google.com') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Docs") ).markUnimportant();
  }
  else if (from.indexOf('harvestapp.com') > -1 || subject.match(/\[(harvest|time( tracking)?|hours|billing|billability)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Harvest") ).markUnimportant();
  }
  else if (from.indexOf('hipchat.com') > -1 || from.indexOf('slack.com') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Slack") ).markUnimportant();
  }
  else if (from.match(/(noreply|notifications).*\@github\.com/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("~/GitHub") ).markUnimportant();
  }
  else if (subject.indexOf('New release(s) available for') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Drupal") ).markUnimportant();
  }

  // Client Discussions
  if (any.indexOf('stanford.edu') > -1 || subject.match(/\[(stanford|sdor|dor(esearch)?|soc)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Stanford") );
  }
  else if (any.indexOf('texasexes.org') > -1 || any.indexOf('texasexes@fourkitchens.com') > -1 || any.indexOf('@jacksonriver.com') > -1 || subject.match(/\[(texas ?exes|txex)\]/i) || subject.match(/^\[JIRA\] \(TXEX-/)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Texas Exes") );
  }
  else if (any.indexOf('fullplateliving.org') > -1 || subject.match(/\[f(ull)?\s?p(late)?\s?(l|living)?\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Full Plate Living") );
  }
  else if (any.indexOf('icann.org') > -1 || subject.match(/\[(gtlds|whois|icann|czdap|czds)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/ICANN") );
  }
  else if (any.indexOf('opensocietyfoundations.org') > -1 || subject.match(/\[o(pen)?\s?s(ociety)?\s?f(oundation)?s?\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Open Society Foundations") );
  }
  else if (any.indexOf('worldpulse.com') > -1 || any.indexOf('worldpulse@fourkitchens.com') > -1 || subject.match(/\[w(orld)?\s?p(ulse)?(\/4K)?\]/i) || subject.match(/^\[JIRA\] \(WP-/)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/World Pulse") );
  }
  else if (any.indexOf('timeinc.net') > -1 || any.indexOf('people@fourkitchens') > -1 || any.indexOf('peoplemag') > -1 || subject.match(/\[people\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Time Inc") );
  }
  else if (any.indexOf('websense.com') > -1 || any.indexOf('websense@fourkitchens.com') > -1 || any.indexOf('@tocquigny.com') > -1 || subject.match(/\[websense\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Websense") );
  }
}
