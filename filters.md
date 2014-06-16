# The Setup

``` js
function autoFilter(thread) {
  // Pull the newest twenty-five threads in the inbox; it is unlikely we'll
  // receive more than that number of _threads_ in just a few minutes.
  var threads = GmailApp.getInboxThreads(0, 25);

  threads.forEach(processIncoming);
}

function processIncoming(thread, index, threads)
  // If this thread already has labels on it, it has already been processed.
  // Don't process the thread again; it's either new enough to show up in the
  // cron job, or a new message came in on this thread.
  if ( thread.getLabels().length ) return;

  var msg = thread.getMessages()[0];
  var subject = thread.getFirstMessageSubject();
  var to = [msg.getTo(), msg.getCc()].join();
  var from = msg.getFrom();


  // Match and apply labels and actions as necessary
  // https://developers.google.com/apps-script/reference/gmail/gmail-message
  /*
    msg.star()
    msg.unstar()
    msg.markRead()

    thread.addLabel() // var label = GmailApp.getUserLabelByName("MyLabel");
    thread.markRead()
    thread.markUnread()
    thread.markImportant()
    thread.markUnimportant()
    thread.moveToInbox()
    thread.moveToArchive()

  */
}
```

# Immediate To-Do Items

- Subject includes `[timely]` case insensitive
  - Star
  - Label ~/Announcements

```
  if (subject.match(/\[timely\]/i) !== null) {
    msg.star();
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }
```

# Whereabouts

- Subject contains `[whereabouts] [wfh] [ooo]` case-insensitive
  - Label ~/Whereabouts
  - Never Spam
  - Never Important
  - Unless subject contains "OOO", "offline", or "unavailable" archive

```
  if (subject.match(/\[(whereabouts|wf\w*|ooo)\]/i) !== null) {
    msg.star();
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );

    if (subject.match(/(ooo|offline|unavailable)/i) === null) {
      thread.moveToArchive();
    }
  }
```

# Google Calendar

- Subject begins with 'Invitation:' 'Accepted:' or 'Canceled Event:'
- AND Body contains 'Google Calendar' _(Not testing for this at the moment)_
  - Label ~/Calendaring
  - Never Important
  - If subject begins with 'Updated Invitation:', auto-archive

```
  if (subject.match(/^((Updated )?Invitation|Accepted|Canceled( Event)?)\:/) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("Calendaring") ).markUnimportant();

    if (subject.indexOf('Updated') === 0) {
      thread.moveToArchive();
    }
  }
```

# General Discussion

- Subject contains `[watercooler]` case insensitive, with possibility for additional context in the `[]` tag
  - Label ~/Watercooler

```
  if (subject.match(/\[.*watercooler.*\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Watercooler") );
  }
```

- Subject contains `[Everyone] [HR] [peopling]` case-insensitive
  - Label ~/Announcements

```
  if (subject.match(/\[(everyone|hr|announcement|people?ing)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }
```

- Subject matches `/\[Drupal(Camp|Con).*?\]/i` or contains [Events]
  - Label ~/Events

```
  if (subject.match(/\[(Drupal(Camp|Con).*?|Event(s)?)\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }
```

- Subject contains `[content] [blog] [fourword] [headless] [drupal]`
  - Label ~/Initiatives

```
  if (subject.match(/\[(content|blog|fourword|headless|drupal).*\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("Initiatives") );
  }
```

# Application Notifications

- From confluence@fourkitchens.atlassian.net
  - Label ~/Confluence

```
  if (from == 'confluence@fourkitchens.atlassian.net') {
    thread.addLabel( GmailApp.getUserLabelByName("Confluence") );
  }
```

- From jira@fourkitchens.atlassian.net
  - Label ~/JIRA

```
  if (from == 'jira@fourkitchens.atlassian.net') {
    thread.addLabel( GmailApp.getUserLabelByName("JIRA") );
  }
```

- From @notablapp.com
  - Label ~/Notable
  - Never Important

```
  if (from.indexOf('notableapp.com') > -1) {
    thread.addLabel( GmailApp.getUserLabelByName("Notable") ).markUnimportant();
  }
```

- From @docs.google.com
- From (via Google Drive)
- Mailed-by doclist.bounces.google.com
  - Never Important
  - Label ~/Docs

- Subject contains `[Harvest]` or `[Time Tracking]`
- From @harvestapp.com
  - Label ~/Harvest

- From donotreply@hipchat.com
  - Label ~/HipChat
  - Never Important

- From noreply@github.com
- From notifications@github.com
- List fourkitchens.github.com
  - Label ~/GitHub


# Client Discussion

- Subject contains `[SDOR] [SOC] [DOR] [Stanford]` case-insensitive
- From @stanford.edu
- To @stanford.edu
  - Label #/Stanford

- Subject matches `\[Texas\s?Exes\]` case-insensitive
  - Label #/Texas Exes

- Subject matches `\[Full\s?Plate\s?(Living)?\]` or `\[FPL\]`
  - Label #/Full Plate Living

- Subject contains [gTLDs] [WHOIS] [ICANN] [CZDAP] [CZDS]
  - Label #/ICANN

- Subject contains [osf] [open society foundations] case-insensitive
- From @opensocietyfoundations.org
  - Label #/Open Society Foundations

- Subject matches `/\[W(orld)?\s?P(ulse)?(\/4K)?\]/`
- To @worldpulse.com
- To worldpulse@fourkitchens.com
- From @worldpulse.com
  - Label #/World Pulse

(Retain Attachments filter in gmail)
