# Email is killing me

We here at [Four Kitchens](http://www.fourkitchens.com) do love us some email.
Last week, I self-awarded a prize for having achieved 4,000 unread items in my
inbox, with another 3,000 read items sitting in my inbox for no reason. I could
keep going for the record, but I thought I'd attempt to use nerdiness to take
better control.

(Ultimately, it's a chore that simply has to be done, but maybe it can be easier.)

## Filters feel limited

I came to Gmail from Exchange; Filters have always seemed less powerful than Rules.

My gripes with Gmail Filters:

- Search is limited, seemingly, to word and number characters; special characters
  have no effect in searches, so I can't isolate "**\[** category **\]**" strings we
  use in subject lines.
- Complex groups of boolean logic have a tendency to produce imprecise results
  and there's no way to have "additional criteria" (even if multiple fields are
  used in the advanced search/filter builder, they're flatted into a single query)
- Other header information or metadata can't be used in the search criteria
  (like mailed-by to help weed out notifications "from" a user sent on their
  behalf by another service)
- Filters cannot be run on sent mail (for the purposes of auto-labeling)
- Filters cannot be run on a delay
- No regular expression matching

## Ta-Daa! [Gmail can be scripted][GMAIL] with JavaScript!

{{ Insert awesomesauce. }}

### Step 1: Migrate Filters to JavaScript for More Power

**Goal:** Label _everything_, both incoming and outgoing. Additionally, some theads
are starred, marked as `/(un)?(important|read)/`, or immediately auto-archived.

``` js
function autoTagMessages(thread, index, threads) {
  var msg     = thread.getMessages()[0],
      subject = thread.getFirstMessageSubject(),
      to      = [msg.getTo(), msg.getCc()].join(', '),
      from    = msg.getFrom(),
      any     = [to, from].join(', ');
```

A new function is created for tagging messages. We compile a list of useful
variables and then move straight to categorizing:

**Timely Messages** generally require direct action, quickly. They are added to
the label '~/Announcements' by
[`thread.addLabel()`][ADDLABEL]
and also starred using
[`message.star()`][ADDSTAR].

_Gotchas:_
- The `addLabel()` function requires a Label object, not a string. Such
  an object can be obtaind using [`GmailApp.getUserLabelByName()`][GETLABEL].
- Be sure to include 'parent/child' if your labels are hierarchical. (In this case,
  'Announcements' is a child of '~').
- When using `string.match()`, be sure to add the `i` flag at the end of the
  pattern to ignore case, since authors may be inconsistent with case.


``` js
  // Immediate To-Do Items
  if (subject.match(/\[timely\]/i) !== null) {
    msg.star();
    thread.addLabel( GmailApp.getUserLabelByName("~/Announcements") );
  }
```

**Whereabouts** emails are generally uninteresting since I work remotely most of
the time. They're all flagged as '~/Whereabouts' and, if they don't appear to
indicate that the sender will be unavailable, they are archived immediately:

``` js
  // Whereabouts Info (except stuff I don't care about)
  if (subject.match(/\[(whereabouts|wf\w*|ooo)\]/i) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Whereabouts") );

    // Most of this is just "I'm working at home today", but this may be
    // a poorly-imagined idea... We'll see...
    if (subject.match(/(ooo|offline|unavailable|errands)/i) === null) {
      thread.moveToArchive();
    }
  }
```

_Regex on line 2 [visualized][RXWFH]:_

![Whereabouts Regular Expressions](images/regex-whereabouts.png)

**Google Calendar** emails can be identified by what the subject line starts with:

``` js
  // Google Calendar Stuff
  if (subject.match(/^((Updated )?Invitation|Accepted|Canceled( Event)?)\:/) !== null) {
    thread.addLabel( GmailApp.getUserLabelByName("~/Calendaring") ).markUnimportant();
  }
```

_Regex [visualized][RXGCAL]:_

![Google Calendar Regular Expressions](images/regex-gcal.png)

**Client** emails get sorted as well. We're a little lax in the formatting of
those tags, but regex makes that easier:

``` js
  else if (any.indexOf('fullplateliving.org') > -1 || subject.match(/\[f(ull)?\s?p(late)?\s?(l|living)?\]/i)) {
    thread.addLabel( GmailApp.getUserLabelByName("#/Full Plate Living") );
  }
```

_Regex [visualized][RXFPL]:_

![FPL Regular Expressions](images/regex-fpl.png)

This matches `[fpl]`, `[full plate]`, `[full plate living]`, `[fullplateliving]`,
and various others, as well as any email sent to/from `@fullplateliving.org`.

**In general,** the function contains three pieces:

- `If` statements testing timeliness or general discussion
- `If/else` statements testing for one of any application notification (Google
  Calendar, GitHub, JIRA, Notable, etc.)
- `If/else` statements testing for one of any client name

This allows a thread to end up with multiple labels at the expense of running a
little slower, but we handle that when we set up the triggers (Step 3).

### Step 2: Script Email Expirations

My second function will archive threads that have dated out. Since the
`autoTagMessages()` function has nearly everything categorized, we will base
retention and expiration off of labels, thread ages, and whether or not
the thread is read. This can be done by executing Gmail searches
programmatically using [`GmailApp.search()`][SEARCH].

Set up the searches as standard search queries:

``` js
  // We'll archive anything matching these searches
  var searches = [
    // General Stuff:
    'in:inbox label:~-whereabouts older_than:1d', // Highly timely
    'in:inbox label:~-calendaring older_than:3d', // Shows in Google Calendar
    '(in:inbox label:~-watercooler) AND ((is:read older_than:7d) OR (is:unread older_than:21d))',
    '(in:inbox label:~-announcements) AND ((is:read older_than:14d) OR (is:unread older_than:1m))',

    // Services Updates (timely; probably seen in-application)
    '(in:inbox) AND (label:~-jira OR label:~-notable OR label:~-harvest) AND ((is:read older_than:1d) OR (is:unread older_than:3d))',
    'in:inbox label:~-hipchat older_than:1d',

    // Catch all, don't keep anything stale:
    'in:inbox is:read older_than:2m'
  ];
```

Then run the searches and, in batches of 100, archive the resulting threads:

``` js
  for (i = 0; i < searches.length; i++) {
    // Run the search, EXLUDING anything that is starred:
    var threads = GmailApp.search(searches[i] + ' AND (-is:starred)');

    // Batch through the results to archive:
    for (j = 0; j < threads.length; j+=batchSize) {
      GmailApp.moveThreadsToArchive(threads.slice(j, j+100));
    }
  }
```

_@TODO: Filter out starred threads, so this next part is unnecessary._

_Gotchas:_ That `AND (-is:starred)` at the end of the search string doesn't
always work. Sometimes starred items are archived. But we have a way to fix that:

``` js
  var threads = GmailApp.search('-in:inbox is:starred');
  for (k = 0; k < threads.length; k+=batchSize) {
    GmailApp.moveThreadsToInbox(threads.slice(j, j+batchSize));
  }
```

### Step 3: Setup Triggers (like Cron for your inbox)

Now we've got two functions:

1. `autoTagMessage()` - given a thread, label it appropriately.
2. `autoArchive()` - search for email that can be archived and do so.

#### Trigger `autoTagMessage` hourly on new email only

Google Apps Scripts can be triggered routinely, but unlike Outlook, there is no
'run as a message is received' option. This can be emulated by:

- having Gmail filters assign one label to every incoming email, and then
- processing all messages in that label on a regular basis (5 minutes).

I assign the "Prefilter" label to all incoming messages by matching against
having an `@` in the `to` field. All other filters were exported and deleted.
Using the Label settings, "Prefilter" can be hidden from your inbox view so you
don't see it.

![Prefilter](images/gmail-all-filter.png)

Then, in a new function, I get those threads and tag them:

``` js
function batchIncoming() {
  GmailApp.getUserLabelByName("Prefilter").getThreads().forEach(autoTagMessages);
}
```

Now we have functions that can be run on a regular basis, so let's do so.
Under the "Resources" menu, click "Current project's triggers" and add these:

![Triggers](images/gscript-triggers.png)

- `autoArchive()` can run hourly (or less frequently, honestly).
- `batchIncoming()` must run very frequently. I chose 5 minutes instead of 1 so
  that it wouldn't start again before the last execution has finished.

## Declare a Reset, then Profit

Be sure to warn folks when you're about to purge a few thousand threads from your
inbox. Then sit back, _keep up with what you can_ using the auto-labeling help
you've built, and let Google Apps Scripts help you.

[GMAIL]: https://developers.google.com/apps-script/reference/gmail/
[ADDLABEL]: https://developers.google.com/apps-script/reference/gmail/gmail-thread#addLabel(GmailLabel)
[ADDSTAR]: https://developers.google.com/apps-script/reference/gmail/gmail-message#star()
[GETLABEL]: https://developers.google.com/apps-script/reference/gmail/gmail-app#getUserLabelByName(String)
[RXWFH]: http://www.regexper.com/#%2F%5C%5B(whereabouts%7Cwf%5Cw*%7Cooo)%5C%5D%2Fi
[RXGCAL]: http://www.regexper.com/#%2F%5E((Updated%20)%3FInvitation%7CAccepted%7CCanceled(%20Event)%3F)%5C%3A%2F
[RXFPL]: http://www.regexper.com/#%2F%5C%5Bf(ull)%3F%5Cs%3Fp(late)%3F%5Cs%3F(l%7Cliving)%3F%5C%5D%2Fi
[SEARCH]: https://developers.google.com/apps-script/reference/gmail/gmail-app#search(String)
