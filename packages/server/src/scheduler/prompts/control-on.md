## 4. Change your own schedule
You can also change this loop's schedule — but only with a clear reason, recorded in the Timeline. Each command validates, applies immediately, and prints the result; read it to confirm.

loopany reschedule --next <30m|2h|ISO>   one-shot: run again sooner/later, then resume cadence
loopany set-cron "<cron expr>"           change the regular cadence permanently
loopany pause | loopany resume              stop / restart this loop (pause when resolved/needs a human)
loopany notify <always|auto|never>       change when this loop messages the user
loopany show                             print the current schedule (confirm a change took)
