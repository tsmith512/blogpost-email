# TEMPLATE CODE

``` js
function autoFilter(thread) {
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

# IMMEDIATE TO DO ITEMS

- Subject includes `[timely]` case insensitive
  - Star
  - Label ~/Announcements

```
  if (subject.match(/\[timely\]/i) !== null) {
    msg.star();
    thread.addLabel( GmailApp.getUserLabelByName("Announcements") );
  }
```

# WHEREABOUTS

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

# GOOGLE CALENDAR

- Subject begins with 'Invitation:' 'Accepted:' or 'Canceled Event:'
- AND Body contains 'Google Calendar'
  - Label ~/Calendaring
  - Never Important

- Subject begins with 'Updated Invitation:'
  - Archive
  - Label ~/Calendaring


# GENERAL DISCUSSION

- Subject contains `[watercooler]` case insensitive
  - Label ~/Watercooler

- Subject contains `[Everyone] [HR]` case-insensitive
  - Label ~/Announcements

- Subject matches `\[Drupal(Camp|Con)[\w\s\d]*?\]` or contains [Events]
  - Label ~/Events


# APPLICATION NOTIFICATIONS

- From confluence@fourkitchens.atlassian.net
  - Label ~/Confluence

- From jira@fourkitchens.atlassian.net
  - Label ~/JIRA

- From @notablapp.com
  - Label ~/Notable
  - Never Important
  - Never Spam

- From @docs.google.com
- From (via Google Drive)
- Mailed-by doclist.bounces.google.com
  - Never Important
  - Never Spam
  - Label ~/Docs

- Subject contains `[Harvest]` or `[Time Tracking]`
- From @harvestapp.com
  - Label ~/Harvest

- From donotreply@hipchat.com
  - Label ~/HipChat
  - Never Important
  - Never Spam

- From noreply@github.com
- From notifications@github.com
- List fourkitchens.github.com
  - Label ~/GitHub


# CLIENT DISCUSSION

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
