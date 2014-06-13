# Email is killing me, I'll use JavaScript and Searching

We here at [Four Kitchens](http://www.fourkitchens.com) do love us some email.
Last week, I self-awarded a prize for having achieved 4,000 unread items in my
inbox, with 2,000 read items (that's 7 emails I haven't addressed per day of my
employment). I could keep going for the record, but I thought I'd attempt to use
nerdiness to take better control.

## Filters feel limited

I came to Gmail from Exchange; Filters have always seemed less powerful than rules.

My gripes with Gmail Filters:

- Search is limited, seemingly, to word and number characters; special characters
  have no effect in searches, so I can't isolate "[category]" strings in subjects.
- Complex groups of boolean logic have a tendency to produce imprecise results
- Filters cannot be run on sent mail (for the purposes of auto-labeling)
- Filters cannot be run on a delay
- No regular expression matching

## Ta-Daa! Gmail can be scripted with JavaScript!

{{ Insert awesomesauce. }}

### Step 1: Migrate Filters to JavaScript

Label _everything_, both incoming and outgoing. Additionally, some theads are
starred, marked as `/(un)?(important|read)/`, or immediately auto-archived.

### Step 2: Script Email Expirations

My second function will run hourly to automatically archive threads that have
dated out. Since the `autoLabel()` function has everything categoried, we will
base retention and expiration off of labels, thread ages, and whether or not
the thread is read.

## Declare a Reset, then Profit

Be sure to warn folks when you're about to purge a few thousand threads from your
inbox. Then sit back, _keep up with what you can_ using the auto-labeling help
you've built, and let Google Apps Scripts help you.
