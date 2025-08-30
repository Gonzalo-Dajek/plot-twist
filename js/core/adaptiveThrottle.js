export function makeAdaptiveThrottle(fn) {
    let initialDelay = 50,
        multiplier = 1.5,
        alpha = 0.20,
        leading = true,
        trailing = true;
    const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

    let delay = initialDelay;
    let ewma = initialDelay;
    let lastInvoke = 0;       // timestamp of last actual invocation
    let timer = null;
    let pendingArgs = null;
    let pendingThis = null;

    // track when the current delay value was set (for "how long it was the throttle amount")
    let delaySetAt = nowMs();

    async function doInvoke() {
        lastInvoke = nowMs();
        const args = pendingArgs;
        const self = pendingThis;
        pendingArgs = pendingThis = null;
        const result = fn.apply(self, args);
        if (result && typeof result.then === 'function') await result;
        // caller will call report(elapsedMs) to update EWMA
    }

    function schedule(ms) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; doInvoke(); }, Math.max(0, ms));
    }

    const wrapper = function(...args) {
        const now = nowMs();
        const remaining = delay - (now - lastInvoke);

        pendingArgs = args;
        pendingThis = this;

        if (remaining <= 0 || remaining > delay) {
            if (timer) { clearTimeout(timer); timer = null; }
            if (leading) {
                doInvoke();
            } else if (trailing) {
                schedule(delay);
            }
        } else if (!timer && trailing) {
            schedule(remaining);
        }
    };

    // Caller manually reports measured elapsed (ms) at end of updatePlotsView
    wrapper.report = function(elapsedMs) {
        ewma = alpha * elapsedMs + (1 - alpha) * ewma;
        const newDelay = Math.max(initialDelay, Math.round(multiplier * ewma));
        if (newDelay !== delay) {
            const now = nowMs();
            // const prevDelay = delay;
            // const lastedMs = now - delaySetAt;
            // // log the change and how long the previous delay value lasted
            // console.log(`throttle delay: ${prevDelay}ms → ${newDelay}ms (previous lasted ${Math.round(lastedMs)} ms)`);
            delay = newDelay;
            delaySetAt = now;
            if (timer) {
                const remaining = Math.max(0, delay - (now - lastInvoke));
                clearTimeout(timer);
                timer = null;
                schedule(remaining);
            }
        }
    };

    wrapper.getDelay = () => delay;
    wrapper.getEWMA = () => ewma;

    wrapper.logCurrent = function() {
        // const now = nowMs();
        // console.log(`current throttle delay: ${delay} ms (active for ${Math.round(now - delaySetAt)} ms)`);
    };

    wrapper.cancel = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        pendingArgs = pendingThis = null;
    };

    wrapper.flush = async () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
            await doInvoke();
        }
    };

    return wrapper;
}
