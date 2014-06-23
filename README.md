We here at [Four Kitchens][4K] do love us some email. Last week, I self-awarded a prize for having achieved 4,000 unread items in my inbox, with another 3,000 read items sitting in my inbox for no reason. I could keep going for the record, but I thought I'd attempt to use nerdiness to take better control.

(Ultimately, it's a chore that simply has to be done, but maybe it can be easier.)

TL;DR: If you just want the source code, grab it on [GitHub][REPO].

## Filters feel limited

I came to Gmail from Exchange; Filters have always seemed less powerful than Rules.

My gripes with Gmail Filters:

- Search is limited, seemingly, to word and number characters; special characters have no effect in searches, so I can't isolate "**\[** category **\]**" strings we use in subject lines.
- Complex groups of boolean logic have a tendency to produce imprecise results and there's no way to have "additional criteria" (even if multiple fields are used in the advanced search/filter builder, they're flatted into a single query)
- Other header information or metadata can't be used in the search criteria (like mailed-by to help weed out notifications "from" a user sent on their behalf by another service)
- Filters cannot be run on sent mail (for the purposes of auto-labeling)
- Filters cannot be run on a delay
- No regular expression matching

## Ta-Daa! [Gmail can be scripted][GMAIL] with JavaScript!

Checkout [Google Apps Script][GSCRIPT] and create a new blank project.

<img src="http://fourword.fourkitchens.com/sites/default/files/blog/inline-images/gscript-new.png" width="620" height="517" alt="Google Apps Script: New Project"  />

This is just JavaScript, but it runs server-side within Google Apps and can be run on regular intervals or on specific triggers. You do not have to be logged in with a window open to make this work!

### Step 1: Migrate Filters to JavaScript for More Power

**Goal:** Label _everything_, both incoming and outgoing. Additionally, some theads are starred, marked as <code>/(un)?(important|read)/</code>, or immediately auto-archived.

<pre><code class="language-javascript">
function autoTagMessages(thread, index, threads) {
  var msg     = thread.getMessages()[0],
      subject = thread.getFirstMessageSubject(),
      to      = [msg.getTo(), msg.getCc()].join(', '),
      from    = msg.getFrom(),
      any     = [to, from].join(', ');
</code></pre>

A new function is created for tagging messages. I compile a list of useful variables and then move straight to categorizing:

**Timely Messages** generally require direct action, quickly. They are added to the label '~/Announcements' by [<code>thread.addLabel()</code>][ADDLABEL] and also starred using [<code>message.star()</code>][ADDSTAR].

_Gotchas:_
- The <code>addLabel()</code> function requires a Label object, not a string. Such an object can be obtaind using [<code>GmailApp.getUserLabelByName()</code>][GETLABEL].
  - Be sure to include 'parent/child' if your labels are hierarchical. (In this case, 'Announcements' is a child of '~').
- When using <code>string.match()</code>, be sure to add the <code>i</code> flag at the end of the pattern to ignore case, since authors may be inconsistent with case.
- If you see an error like <code>Cannot retrieve (line X, file "Code")</code> where X is a line containing a <code>getUserLabelByName</code> call, the most likely cause is that [Gmail couldn't find that label][LABELERROR].

<pre><code class="language-javascript">
// Immediate To-Do Items
if (subject.match(/\[timely\]/i) !== null) {
  msg.star();
  thread.addLabel( GmailApp.getUserLabelByName("~/Announcements") );
}
</code></pre>

**Whereabouts** emails are generally uninteresting since I work remotely most of the time. They're all flagged as '~/Whereabouts' and, if they don't appear to indicate that the sender will be unavailable, they are archived immediately:

<pre><code class="language-javascript">
// Whereabouts Info (except stuff I don't care about)
if (subject.match(/\[(whereabouts|wf\w*|ooo)\]/i) !== null) {
  thread.addLabel( GmailApp.getUserLabelByName("~/Whereabouts") );

  // Most of this is just "I'm working at home today", but this may be
  // a poorly-imagined idea... We'll see...
  if (subject.match(/(ooo|offline|unavailable|errands)/i) === null) {
    thread.moveToArchive();
  }
}
</code></pre>

_Regex on line 2 [visualized][RXWFH]:_

<img src="http://fourword.fourkitchens.com/sites/default/files/blog/inline-images/regex-whereabouts.png" width="305" height="161" alt="Whereabouts Regular Expressions"  />

**Google Calendar** emails can be identified by what the subject line starts with:

<pre><code class="language-javascript">
// Google Calendar Stuff
if (subject.match(/^((Updated )?Invitation|Accepted|Canceled( Event)?)\:/) !== null) {
  thread.addLabel( GmailApp.getUserLabelByName("~/Calendaring") ).markUnimportant();
}
</code></pre>

_Regex [visualized][RXGCAL]:_

<img src="http://fourword.fourkitchens.com/sites/default/files/blog/inline-images/regex-gcal.png" width="422" height="225" alt="Google Calendar Regular Expressions"  />

**Client** emails get sorted as well. We're a little lax in the formatting of those tags, but regex makes that easier:

<pre><code class="language-javascript">
else if (any.indexOf('fullplateliving.org') &gt; -1 || subject.match(/\[f(ull)?\s?p(late)?\s?(l|living)?\]/i)) {
  thread.addLabel( GmailApp.getUserLabelByName("#/Full Plate Living") );
}
</code></pre>

_Regex [visualized][RXFPL]:_

<img src="http://fourword.fourkitchens.com/sites/default/files/blog/inline-images/regex-fpl.png" width="620" height="94" alt="FPL Regular Expressions"  />

This matches <code>[fpl]</code>, <code>[full plate]</code>, <code>[full plate living]</code>, <code>[fullplateliving]</code>, and various others, as well as any email sent to/from <code>@fullplateliving.org</code>.

**In general,** the function contains three pieces:

- <code>If</code> statements testing timeliness or general discussion topics
- <code>If/else</code> statements testing for one of any application notification (Google Calendar, GitHub, JIRA, Notable, etc.) since a thread won't be from multiple
- <code>If/else</code> statements testing for one of any client name, since a thread is unlikely to pertain to multiple clients directly, although I may change this.

This allows a thread to end up with multiple labels at the expense of running a little slower, but the load is reduced by being conservative with the triggers (Step 3).

### Step 2: Script Email Expirations

My second function will archive threads that have dated out. Since the <code>autoTagMessages()</code> function has nearly everything categorized, I'll base retention and expiration off of labels, thread ages, and whether or not the thread is read. This can be done by executing Gmail searches programmatically using [<code>GmailApp.search()</code>][SEARCH].

Set up the searches as standard search queries:

<pre><code class="language-javascript">
// Archive anything matching these searches
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
</code></pre>

Then run the searches and, in batches of 100 (`batchSize`), archive the resulting threads:

<pre><code class="language-javascript">
for (i = 0; i &lt; searches.length; i++) {
  // Run the search, EXLUDING anything that is starred:
  var threads = GmailApp.search(searches[i] + ' AND (-is:starred)');

  // Batch through the results to archive:
  for (j = 0; j &lt; threads.length; j+=batchSize) {
    GmailApp.moveThreadsToArchive(threads.slice(j, j+batchSize));
  }
}
</code></pre>

_Gotchas:_ That <code>AND (-is:starred)</code> at the end of the search string doesn't always work. Sometimes threads with starred messages are archived anyway. But there is a way to fix that:

<pre><code class="language-javascript">
var threads = GmailApp.search('-in:inbox is:starred');
for (k = 0; k &lt; threads.length; k+=batchSize) {
  GmailApp.moveThreadsToInbox(threads.slice(j, j+batchSize));
}
</code></pre>

_(I didn't say it was a graceful way... Investigating better options...)_

### Step 3: Setup Triggers (like Cron for your inbox)

Now I have two functions:

1. <code>autoTagMessage()</code> - given a thread, label it appropriately.
2. <code>autoArchive()</code> - search for email that can be archived and do so.

#### Trigger <code>autoTagMessage</code> hourly on new email only

Google Apps Scripts can be triggered routinely, but unlike Outlook, there is no 'run as a message is received' option. [This can be emulated by][NEWEMAILMETHOD]:

- having Gmail filters assign one label to every incoming email, and then
- processing all messages in that label on a regular basis (5 minutes).

I assign the "Prefilter" label to all incoming messages by matching against having an <code>@</code> in the <code>to</code> field. All other filters were exported and deleted. Using the Label settings, "Prefilter" can be hidden from your inbox view so you don't see it.

<img src="http://fourword.fourkitchens.com/sites/default/files/blog/inline-images/gmail-all-filter.png" width="359" height="86" alt="Prefilter"  />

**Unexpected benefit:** I noticed that this "Prefilter" label is applied to all outbound email as well (perhaps because it matches only against the <code>to</code> field), allowing messages I send to be auto-labeled with no additional work!

Then, in a new function, I get those threads and tag them:

<pre><code class="language-javascript">
function batchIncoming() {
  GmailApp.getUserLabelByName("Prefilter").getThreads().forEach(autoTagMessages);
}
</code></pre>

Next, amend <code>autoTagMessages()</code> to remove that label, and, if a thread has multiple messages, abort. This will prevent re-labeling an entire thread for any new messages in it (which would only be annoying in the case that a message is starred; for example, replies to a <code>[timely]</code> thread would be starred otherwise).

<pre><code class="language-javascript">
thread.removeLabel( GmailApp.getUserLabelByName("Prefilter") );
if (thread.getMessageCount() &gt; 1) { return; }
</code></pre>

Now I have two functions that can be run on a regular basis, so let's do so. Under the "Resources" menu, click "Current project's triggers" and add these:

<img src="http://fourword.fourkitchens.com/sites/default/files/blog/inline-images/gscript-triggers.png" width="620" height="248" alt="Triggers"  />

- <code>autoArchive()</code> can run hourly (or less frequently, honestly).
- <code>batchIncoming()</code> must run very frequently. I chose 5 minutes instead of 1 so that it wouldn't start again before the last execution has finished.
  - Google Apps Scripts will timeout and abort at five minutes, although I haven't hit that limitation.

## Declare a Reset, then Profit

Be sure to warn folks when you're about to purge a few thousand threads from your inbox. Then sit back, _keep up with what you can_ using the auto-labeling help you've built, and let Google Apps Scripts help you.

## Next Steps

I'm still working to:

1. Find an efficient way to filter threads with starred messages out of a <code>GmailApp.search()</code> result, so that I don't have to do that stupid "un-archive any starred threads" maneuver in <code>autoArchive()</code>. There is a method [<code>thread.hasStarredMessages()</code>][HASSTARS], but using that would require iterating over each thread in the result-set, which seems expensive for an otherwise batched process.

## Additional Reading

- [Create time-based Gmail filters with Google Apps Script][TIMEBASEDFILTERS]
- [Awesome Things You Can Do With Google Scripts][USEFULSCRIPTS]

[TSMITH]: http://www.tsmithcreative.com/
[FOURWORD]: http://fourword.fourkitchens.com/
[4K]: http://fourkitchens.com/
[REPO]: https://github.com/tsmith512/blogpost-email
[GMAIL]: https://developers.google.com/apps-script/reference/gmail/
[GSCRIPT]: http://www.google.com/script/start/
[ADDLABEL]: https://developers.google.com/apps-script/reference/gmail/gmail-thread#addLabel(GmailLabel)
[ADDSTAR]: https://developers.google.com/apps-script/reference/gmail/gmail-message#star()
[GETLABEL]: https://developers.google.com/apps-script/reference/gmail/gmail-app#getUserLabelByName(String)
[LABELERROR]: http://stackoverflow.com/questions/15688106/google-script-cannot-retrieve-line-9-file-code
[RXWFH]: http://www.regexper.com/#%2F%5C%5B(whereabouts%7Cwf%5Cw*%7Cooo)%5C%5D%2Fi
[RXGCAL]: http://www.regexper.com/#%2F%5E((Updated%20)%3FInvitation%7CAccepted%7CCanceled(%20Event)%3F)%5C%3A%2F
[RXFPL]: http://www.regexper.com/#%2F%5C%5Bf(ull)%3F%5Cs%3Fp(late)%3F%5Cs%3F(l%7Cliving)%3F%5C%5D%2Fi
[SEARCH]: https://developers.google.com/apps-script/reference/gmail/gmail-app#search(String)
[NEWEMAILMETHOD]: http://stackoverflow.com/a/16932138
[HASSTARS]: https://developers.google.com/apps-script/reference/gmail/gmail-thread#hasStarredMessages()
[TIMEBASEDFILTERS]: http://www.johneday.com/422/time-based-gmail-filters-with-google-apps-script
[USEFULSCRIPTS]: http://www.labnol.org/internet/google-scripts/28281/
