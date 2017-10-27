import { cleanupFixture, setupFixture } from "./testsetup";
import { observeEvents } from "./utils";

import * as chai from "chai";
import * as errors from "../src/plugins/errors";

let assert = chai.assert;

describe("Error Tests", () => {
    beforeEach(() => {
        setupFixture(["errors"]);
    });
    afterEach(cleanupFixture);

    it("checks that a single error event is logged", (done: DoneFn) => {
        let stopObserving = observeEvents();
        let syntheticEvent = document.createEvent("CustomEvent");
        let message = "sample error text";
        let filename = "sample filename";
        let lineno = "sample error text";
        let colno = "sample error text";
        syntheticEvent.initEvent("error", true, true);
        syntheticEvent["message"] = message;
        syntheticEvent["filename"] = filename;
        syntheticEvent["lineno"] = lineno;
        syntheticEvent["colno"] = colno;
        errors.logError(syntheticEvent);
        let events = stopObserving();
        assert.equal(events.length, 1);
        assert.equal(events[0].data.type, Instrumentation.JsError);
        assert.equal(events[0].data.message, message);
        assert.equal(events[0].data.source, filename);
        assert.equal(events[0].data.lineno, lineno);
        assert.equal(events[0].data.colno, colno);
        done();
     });

    it("checks empty message when not passed", (done: DoneFn) => {
        let stopObserving = observeEvents();
        let syntheticEvent = document.createEvent("CustomEvent");
        let message = null;
        let filename = "sample filename";
        let lineno = "sample error text";
        let colno = "sample error text";
        syntheticEvent.initEvent("error", true, true);
        syntheticEvent["filename"] = filename;
        syntheticEvent["lineno"] = lineno;
        syntheticEvent["colno"] = colno;
        errors.logError(syntheticEvent);
        let events = stopObserving();
        assert.equal(events.length, 1);
        assert.equal(events[0].data.type, Instrumentation.JsError);
        assert.equal(events[0].data.message, message);
        assert.equal(events[0].data.source, filename);
        assert.equal(events[0].data.lineno, lineno);
        assert.equal(events[0].data.colno, colno);
        done();
    });

    it("checks that multiple error events are logged", (done: DoneFn) => {
        let stopObserving = observeEvents();
        let syntheticEvent = document.createEvent("CustomEvent");
        let message = "sample error text";
        syntheticEvent.initEvent("error", true, true);
        syntheticEvent["message"] = message;
        errors.logError(syntheticEvent);
        errors.logError(syntheticEvent);
        errors.logError(syntheticEvent);
        let events = stopObserving();
        assert.equal(events.length, 3);
        assert.equal(events[0].data.type, Instrumentation.JsError);
        assert.equal(events[0].data.message, message);
        done();
    });

    it("checks error objects directly passed are parsed", (done: DoneFn) => {
        let stopObserving = observeEvents();
        let message = "sample error text";
        let syntheticEvent = document.createEvent("CustomEvent");
        syntheticEvent["error"] = new Error(message);
        errors.logError(syntheticEvent);
        let events = stopObserving();
        assert.equal(events.length, 1);
        assert.equal(events[0].data.type, Instrumentation.JsError);
        assert.equal(events[0].data.message, message);
        done();
    });
});
