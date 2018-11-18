import { Scenario } from "./scenario";
import { iResponse } from "./response";
import { Flagpole } from ".";

let $: CheerioStatic = require('cheerio');

/**
 * Various different types of properties that assertions can be made against
 */
export class Node {

    protected response: iResponse;
    protected name: string;
    protected obj: any;

    constructor(response: iResponse, name: string, obj: any) {
        this.response = response;
        this.name = name;
        this.obj = obj;
    }

    /**
    * Test the raw object to see if its nullish
    */
    protected isNullOrUndefined(): boolean {
        return Flagpole.isNullOrUndefined(this.obj);
    }

    /**
     * Is this node a DOM Element?
     */
    protected isDomElement(): boolean {
        return (Flagpole.toType(this.obj) == 'cheerio');
    }

    protected getTagName(): string | null {
        if (this.isDomElement()) {
            return this.obj.get(0).tagName;
        }
        return null;
    }

    /**
     * Check if the underlying html element is a form tag
     */
    protected isFormElement(): boolean {
        if (this.isDomElement()) {
            return this.getTagName() === 'form';
        }
        return false;
    }

    /**
     * Check if the underlying html element is a button tag
     */
    protected isButtonElement(): boolean {
        if (this.isDomElement()) {
            return this.getTagName() === 'button';
        }
        return false;
    }

    /**
     * Check if the underlying html element is an a tag
     */
    protected isLinkElement(): boolean {
        if (this.isDomElement()) {
            return this.getTagName() === 'a';
        }
        return false;
    }

    /**
     * Is this element one we can fake click on?
     */
    protected isClickable(): boolean {
        return (this.isLinkElement() || this.isButtonElement());
    }

    /**
     * 
     */
    protected isArray(): boolean {
        return Flagpole.toType(this.obj) == 'array';
    }

    /**
     * 
     */
    protected isString(): boolean {
        return Flagpole.toType(this.obj) == 'string';
    }

    /**
     * 
     */
    protected isObject(): boolean {
        return Flagpole.toType(this.obj) == 'object';
    }

    /**
     * 
     * @param key 
     */
    protected hasProperty(key: string): boolean {
        return this.obj.hasOwnProperty && this.obj.hasOwnProperty(key);
    }

    /**
     * Write a message for a passing assertion
     *
     * @param {string} message
     */
    protected pass(message: string): Scenario {
        return this.response.scenario.pass(message);
    }

    /**
     * Write message for a failing assertion
     *
     * @param {string} message
     */
    protected fail(message: string): Scenario {
        return this.response.scenario.fail(message);
    }

    /**
     * Get the raw object
     */
    public get(index?: number): any {
        if (typeof index !== 'undefined') {
            if (this.isArray()) {
                return this.obj[index];
            }
            else if (this.isDomElement()) {
                return this.obj.eq(index);
            }
        }
        // Still here? return it all
        return this.obj;
    }

    /**
    * Sometimes we need to get the actual string
    */
    public toString(): string {
        if (this.isDomElement()) {
            return (this.obj.text() || this.obj.val()).toString();
        }
        else if (!this.isNullOrUndefined() && this.obj.toString) {
            return this.obj.toString();
        }
        else {
            return String(this.obj);
        }
    }

    /**
     * Select another element.
     * 
     * @param path 
     * @param findIn 
     */
    public select(path: string, findIn?: any): Node {
        return this.response.select(path, findIn);
    }

    /**
     * 
     * @param key 
     */
    public headers(key?: string): Node {
        return this.response.headers(key);
    }

    /**
     * 
     */
    public status(): Node {
        return this.response.status();
    }

    /**
     * 
     */
    public loadTime(): Node {
        return this.response.loadTime();
    }

    /**
    * Gets back to the last element selected
    */
    public and(): Node {
        return this.response.and();
    }

    /**
     * Flip the next assertion
     */
    public not(): Node {
        this.response.not();
        return this;
    }

    /**
     * Write message for a comment
     *
     * @param {string} message
     */
    public comment(message: string): Node {
        this.response.scenario.comment(message);
        return this;
    }

    /**
     * Override the default message for this test so we can have a custom message that is more human readable
     *
     * @param {string} message
     */
    public label(message: string): Node {
        this.response.label(message);
        return this;
    }

    /**
     * For debugging, just spit out a value
     */
    public echo(): Node {
        this.comment(this.name + ' = ' + this.obj);
        return this;
    }

    /**
     * For debugging, just spit out this object's type
     */
    public typeof(): Node {
        this.comment('typeof ' + this.name + ' = ' + Flagpole.toType(this.obj));
        return this;
    }

    /**
     * SIMULATED ACTIONS
     */

    /**
     * Click on this link (kick off another scenario)
     *
     * @param {Scenario} nextScenario
     */
    public click(nextScenario: Scenario): Node {
        // If this was a link, click it and then run the resulting scenaior
        if (this.isLinkElement()) {
            let href: string = this.attribute('href').toString();
            // Need more logic here to handle relative links
            if (href && !nextScenario.isDone()) {
                nextScenario.open(href).execute();
            }
        }
        // If this was a button and it has a form to submit... submit that form
        else if (this.isButtonElement()) {
            if (this.attribute('type').toString().toLowerCase() === 'submit') {
                let formNode: Node = new Node(this.response, 'form', this.obj.parents('form'));
                formNode.submit(nextScenario);
            }
        }
        else {
            this.fail('Not a clickable element');
        }
        return this;
    }

    /**
     * Simulate form submission
     * 
     * @param nextScenario 
     */
    public submit(nextScenario: Scenario): Node {
        if (this.isFormElement()) {
            // If there is an action or else submit to self
            let action: string = this.obj.attr('action') || this.response.scenario.getUrl() || '';
            if (action.length > 0) {
                let method: string = this.obj.attr('method') || 'get';
                nextScenario.method(method);
                if (method == 'get') {
                    action = action.split('?')[0] + '?' + this.obj.serialize();
                }
                else {
                    let formDataArray: any[] = this.obj.serializeArray();
                    let formData: any = {};
                    formDataArray.forEach(function (input: any) {
                        formData[input.name] = input.value;
                    });
                    nextScenario.form(formData)
                }
                // Need more logic here to handle relative links
                if (!nextScenario.isDone()) {
                    this.comment('Submitting form');
                    nextScenario.open(action).execute();
                }
            }
        }
        return this;
    }

    public fillForm(formData: any): Node {
        if (this.isFormElement()) {
            this.comment('Filling out form');
            if (Flagpole.toType(formData) === 'object') {
                let form: Cheerio = this.obj;
                for (let name in formData) {
                    this.assert(
                        form.find('[name="' + name + '"]').val(formData[name]).val() == formData[name],
                        'Form field ' + name + ' equals ' + formData[name],
                        'Form field ' + name + ' does not equal ' + formData[name]
                    );
                }
            }
        }
        else {
            this.fail('Not a form');
        }
        return this;
    }

    /**
     * DOM TRAVERSAL
     */

    public find(selector: string): Node {
        return this.response.select(selector, this.obj);
    }

    public closest(selector: string): Node {
        let name: string = 'closest ' + selector;
        if (this.isDomElement()) {
            return this.response.setLastElement(
                null, new Node(this.response, name, this.get().closest(selector))
            );
        }
        else if (this.isObject()) {
            let arrPath: string[] = (this.response.getLastElementPath() || '').split('.');
            let found: boolean = false;
            // Loop through the path backwards
            let i = arrPath.length - 1;
            for (; i >= 0; i--) {
                if (arrPath[i] == selector) {
                    found = true;
                    break;
                }
            }
            // Found something that matched selector..  So build path up to that point
            if (found) {
                return this.select(arrPath.slice(0, i + 1).join('.'));
            }
        }
        return this.response.setLastElement('', new Node(this.response, name, null));
    }

    public parents(selector?: string): Node {
        let name: string = 'parent ' + selector;
        // If there is no selector then this is the same as the parent method
        if (typeof selector == 'undefined') {
            return this.parent();
        }
        if (this.isDomElement()) {
            return this.response.setLastElement(
                null, new Node(this.response, name, this.get().parents(selector))
            );
        }
        else if (this.isObject()) {
            let arrPath: string[] = (this.response.getLastElementPath() || '').split('.');
            if (arrPath.length > 1) {
                // Loop backwards, starting at the second to last element in path
                let found: boolean = false;
                let i = arrPath.length - 2;
                for (; i >= 0; i--) {
                    if (arrPath[i] == selector) {
                        found = true;
                        break;
                    }
                }
                // Found something that matched selector..  So build path up to that point
                if (found) {
                    return this.select(arrPath.slice(0, i + 1).join('.'));
                }
            }  
        }
        return this.response.setLastElement(null, new Node(this.response, name, null));
    }

    public parent(): Node {
        let name: string = 'parent';
        if (this.isDomElement()) {
            return this.response.setLastElement(null, new Node(this.response, name, this.get().parent()));
        }
        else if (this.isObject()) {
            let arrPath: string[] = (this.response.getLastElementPath() || '').split('.');
            // If the last selected path is at least 2 deep
            if (arrPath.length > 1) {
                return this.select(arrPath.slice(0, arrPath.length - 1).join('.'));
            }
            // Else return top level
            else {
                return this.response.setLastElement('', new Node(this.response, name, this.response.getRoot()));
            }
        }
        return this.response.setLastElement(null, new Node(this.response, name, null));
    }

    public siblings(selector): Node {
        let name: string = 'siblings ' + selector;
        if (this.isDomElement()) {
            return this.response.setLastElement(
                null, new Node(this.response, name, this.get().siblings(selector))
            );
        }
        else if (this.isObject()) {
            return this.parent().children(selector);
        }
        return this.response.setLastElement(null, new Node(this.response, name, null));
    }

    public children(selector): Node {
        let name: string = 'children ' + selector;
        if (this.isDomElement()) {
            return this.response.setLastElement(
                null, new Node(this.response, name, this.get().children(selector))
            );
        }
        else if (this.isObject() || this.isArray()) {
            let obj: any = this.get();
            if (typeof selector !== 'undefined') {
                return this.select(selector, obj);
            }
            return this.response.setLastElement(null, new Node(this.response, name, obj));
        }
        return this.response.setLastElement(null, new Node(this.response, name, null));
    }

    public next(selector): Node {
        let name: string = 'next ' + selector;
        if (this.isDomElement()) {
            return this.response.setLastElement(
                null, new Node(this.response, name, this.get().next(selector))
            );
        }
        else if (this.isObject()) {
            return this.parent().children(selector);
        }
        return this.response.setLastElement(null, new Node(this.response, name, null));
    }

    public prev(selector): Node {
        let name: string = 'next ' + selector;
        if (this.isDomElement()) {
            return this.response.setLastElement(
                null, new Node(this.response, name, this.get().prev(selector))
            );
        }
        else if (this.isObject()) {
            return this.parent().children(selector);
        }
        return this.response.setLastElement(null, new Node(this.response, name, null));
    }

    /**
     * Alias for nth because it's what jQuery uses even though it's a stupid name
     *
     * @param {number} i
     */
    public eq(i: number): Node {
        return this.nth(i);
    }

    /**
     * Select the nth value or an array or collection
     *
     * @param {number} i
     */
    public nth(i: number): Node {
        let obj: any = null;
        if (i >= 0) {
            if (this.isArray()) {
                obj = this.obj[i];
            } 
            else if (this.isDomElement()) {
                obj = this.obj.eq(i);
            }
        }
        return this.response.setLastElement(null, new Node(this.response, this.name + '[' + i + ']', obj));
    }

    /**
     * Get the first element in the array
     */
    public first(): Node {
        return this.nth(0);
    }

    /**
     * Get the last element in the array
     */
    public last(): Node {
        return this.nth(
            (this.obj && this.obj.length) ? (this.obj.length - 1) : -1
        );
    }

    /**
     * PROPERTIES AND ATTRIBUTES
     */

    /**
     * Get the attribute by name of this object
     *
     * @param {string} key
     */
    public attribute(key: string): Node {
        let text: any = null;
        if (this.isDomElement()) {
            text = this.obj.attr(key);
        }
        else if (!Flagpole.isNullOrUndefined(this.obj) && this.hasProperty(key)) {
            text = this.obj[key];
        }
        else if (this.response.getLastElement().isDomElement()) {
            text = this.response.getLastElement().get().attr(key);
        }
        return new Node(this.response, this.name + '[' + key + ']', text);
    }

    /**
     * Get the property by name of this object
     *
     * @param {string} key
     */
    public property(key: string): Node {
        let text: any;
        if (this.isDomElement()) {
            text = this.obj.prop(key);
        }
        else if (!this.isNullOrUndefined() && this.hasProperty(key)) {
            text = this.obj[key];
        }
        else if (this.response.getLastElement().isDomElement()) {
            text = this.response.getLastElement().get().prop(key);
        }
        return new Node(this.response, this.name + '[' + key + ']', text);
    }

    /**
     * Get the data attribute by name of this object
     *
     * @param {string} key
     */
    public data(key: string): Node {
        let text: any = null;
        if (this.isDomElement()) {
            text = this.obj.data(key);
        }
        else if (!this.isNullOrUndefined() && this.hasProperty(key)) {
            text = this.obj[key];
        }
        else if (this.response.getLastElement().isDomElement()) {
            text = this.response.getLastElement().get().data(key);
        }
        return new Node(this.response, this.name + '[' + key + ']', text);
    }

    /**
     * Get the value of this object
     */
    public val(): Node {
        let text: any = null;
        if (this.isDomElement()) {
            text = this.obj.val();
        }
        else if (!this.isNullOrUndefined()) {
            text = this.obj;
        }
        return new Node(this.response, 'Value of ' + this.name, text);
    }

    /**
    * Get the text of this object
    */
    public text(): Node {
        let text: any = null;
        if (this.isDomElement()) {
            text = this.obj.text();
        }
        else if (!this.isNullOrUndefined()) {
            text = this.obj.toString();
        }
        return new Node(this.response, 'Text of ' + this.name, text);
    }

    /**
     * Find the number of elements in array or length of a string
     */
    public length(): Node {
        let count: number = (this.obj && this.obj.length) ?
            this.obj.length : 0;
        return new Node(this.response, 'Length of ' + this.name, count);
    }

    /**
     * Get the float/double value of this object
     */
    public parseFloat(): Node {
        return new Node(this.response, 'Float of ' + this.name, parseFloat(this.toString()));
    }

    /**
     * Get the integer value of this object
     */
    public parseInt(): Node {
        return new Node(this.response, 'Integer of ' + this.name, parseInt(this.toString()));
    }

    /**
     * Trim extra whitespace around the string value
     */
    public trim(): Node {
        let text: string = this.toString().trim();
        return new Node(this.response, 'Trimmed text of ' + this.name, text);
    }

    /**
     * Lowercase the string value
     */
    public toLowerCase(): Node {
        let text: string = this.toString().toLowerCase();
        return new Node(this.response, 'Lowercased text of ' + this.name, text);
    }

    /**
     * Uppercase the string value
     */
    public toUpperCase(): Node {
        let text: string = this.toString().toUpperCase();
        return new Node(this.response, 'Uppercased text of ' + this.name, text);
    }

    /**
     * Replace the string value
     *
     * @param {string | RegExp} search
     * @param {string} replace
     */
    public replace(search: string | RegExp, replace: string): Node {
        let text: string = this.toString().replace(search, replace);
        return new Node(this.response, 'Replaced text of ' + this.name, text);
    }

    /**
     * LOOPS
     */

    /**
     * Loop through it
     *
     * @param {Function} callback
     */
    public each(callback: Function): Node {
        let name: string = this.name;
        let response: iResponse = this.response;
        if (this.isDomElement()) {
            this.obj.each(function (index, el) {
                el = $(el);
                callback(
                    new Node(response, name + '[' + index + ']', el)
                );
            });
        }
        else if (this.isArray()) {
            this.obj.forEach(function (el, index) {
                callback(
                    new Node(response, name + '[' + index + ']', el)
                );
            });
        }
        else if (Flagpole.toType(this.obj) == 'object') {
            let obj: {} = this.obj;
            this.obj.keys().forEach(function (key) {
                callback(
                    new Node(response, name + '[' + key + ']', obj[key])
                );
            });
        }
        else if (Flagpole.toType(this.obj) == 'string') {
            this.obj.toString().trim().split(' ').forEach(function (word, index) {
                callback(
                    new Node(response, name + '[' + index + ']', word)
                );
            });
        }
        return this;
    }

    /**
     * Loops through the element and expects the return from every callback to be true
     *
     * @param {Function} callback
     */
    public every(callback: Function): Node {
        let name: string = this.name;
        let response: iResponse = this.response;
        let every: boolean = true;
        this.response.startIgnoringAssertions();
        if (this.isDomElement()) {
            this.obj.each(function (index, el) {
                el = $(el);
                let element: Node = new Node(response, name + '[' + index + ']', el);
                if (!callback(element)) {
                    every = false;
                }
            });
        }
        else if (this.isArray()) {
            every = this.obj.every(function (el, index) {
                return callback(
                    new Node(response, name + '[' + index + ']', el)
                );
            });
        }
        else if (this.isObject()) {
            let obj: {} = this.obj;
            every = this.obj.keys().every(function (key) {
                return callback(
                    new Node(response, name + '[' + key + ']', obj[key])
                );
            });
        }
        else if (this.isString()) {
            every = this.obj.toString().trim().split(' ').every(function (word, index) {
                return callback(
                    new Node(response, name + '[' + index + ']', word)
                );
            });
        }
        this.response.stopIgnoringAssertions();
        this.assert(every,
            'Every ' + this.name + ' passed',
            'Every ' + this.name + ' did not pass'
        );
        return this;
    }

    /**
     * Loops through the element and expects the return from every callback to be true
     *
     * @param {Function} callback
     */
    public some(callback: Function): Node {
        let name: string = this.name;
        let response: iResponse = this.response;
        let some: boolean = false;
        this.response.startIgnoringAssertions();
        if (this.isDomElement()) {
            this.obj.each(function (index, el) {
                el = $(el);
                let element: Node = new Node(response, name + '[' + index + ']', el);
                if (callback(element)) {
                    some = true;
                }
            });
        }
        else if (this.isArray()) {
            some = this.obj.some(function (el, index) {
                return callback(
                    new Node(response, name + '[' + index + ']', el)
                );
            });
        }
        else if (this.isObject()) {
            let obj: {} = this.obj;
            some = this.obj.keys().some(function (key) {
                return callback(
                    new Node(response, name + '[' + key + ']', obj[key])
                );
            });
        }
        else if (this.isString()) {
            some = this.obj.toString().trim().split(' ').some(function (word, index) {
                return callback(
                    new Node(response, name + '[' + index + ']', word)
                );
            });
        }
        this.response.stopIgnoringAssertions();
        this.assert(some,
            'Some ' + this.name + ' passed',
            'No ' + this.name + ' passed'
        );
        return this;
    }

    /**
     * Alias for some
     * 
     * @param callback 
     */
    public any(callback: Function): Node {
        return this.some(callback);
    }

    /**
     * ASSERTIONS 
     */

    /**
     * Does this element have this class name?
     *
     * @param {string} className
     */
    public hasClass(className: string): Node {
        if (this.isDomElement()) {
            this.assert(this.obj.hasClass(className),
                this.name + ' has class ' + className,
                this.name + ' does not have class ' + className
            );
        }
        return this;
    }
    
    /**
    * Is this object's value greater than this?
    *
    * @param {number} value
    */
    public greaterThan(value: number): Node {
        return this.assert(this.obj > value,
            this.name + ' is greater than ' + value + ' (' + this.obj + ')',
            this.name + ' is not greater than ' + value + ' (' + this.obj + ')'
        );
    }

    /**
     *  Is this object's value greater than or equal to this?
     *
     * @param value
     */
    public greaterThanOrEquals(value: any): Node {
        return this.assert(this.obj >= value,
            this.name + ' is greater than or equal to ' + value + ' (' + this.obj + ')',
            this.name + ' is not greater than or equal to ' + value + ' (' + this.obj + ')'
        );
    }

    /**
     * Is this object's value less than this?
     *
     * @param {number} value
     */
    public lessThan(value: number): Node {
        return this.assert(this.obj < value,
            this.name + ' is less than ' + value + ' (' + this.obj + ')',
            this.name + ' is not less than ' + value + ' (' + this.obj + ')'
        );
    }

    /**
     * Is this object's value less or equal to this?
     *
     * @param value
     */
    public lessThanOrEquals(value: any): Node {
        return this.assert(this.obj <= value,
            this.name + ' is less than or equal to ' + value + ' (' + this.obj + ')',
            this.name + ' is not less than or equal to ' + value + ' (' + this.obj + ')'
        );
    }

    /**
     * Make an assertion
     * 
     * @param statement 
     * @param passMessage 
     * @param failMessage 
     */
    public assert(statement: boolean, passMessage: string, failMessage: string): Node {
        this.response.assert(statement, passMessage, failMessage);
        return this;
    }

    /**
     * Does this object contain this? Works for strings, arrays, and objects alike
     *
     * @param {string} string
     */
    public contains(string: string): Node {
        let contains: boolean = false;
        if (this.isArray()) {
            contains = (this.obj.indexOf(string) >= 0);
        }
        else if (this.isObject()) {
            contains = (this.obj.hasOwnProperty(string));
        }
        else if (!this.isNullOrUndefined()) {
            contains = (this.toString().indexOf(string) >= 0);
        }
        return this.assert(contains,
            this.name + ' contains ' + string,
            this.name + ' does not contain ' + string
        );
    }

    /**
     * Alias for contains
     * 
     * @param string 
     */
    public contain(string: string): Node {
        return this.contains(string);
    }

    /**
     * Test with regular expression
     *
     * @param {RegExp} pattern
     */
    public matches(pattern: RegExp): Node {
        let value: string = this.toString();
        return this.assert(pattern.test(value),
            this.name + ' matches ' + String(pattern),
            this.name + ' does not match ' + String(pattern) + ' (' + value + ')'
        );
    }

    /**
     * Does it start with this value?
     *
     * @param {string} matchText
     */
    public startsWith(matchText: string): Node {
        let assert: boolean = false;
        let value: string = '';
        if (!this.isNullOrUndefined()) {
            value = this.toString();
            assert = (value.indexOf(matchText) === 0);
        }
        return this.assert(assert,
            this.name + ' starts with ' + matchText,
            this.name + ' does not start with ' + matchText + ' (' + value + ')'
        );
    }

    /**
     * Does this end with this value?
     *
     * @param {string} matchText
     */
    public endsWith(matchText: string): Node {
        let assert: boolean = false;
        let value: string = '';
        if (!this.isNullOrUndefined()) {
            value = this.toString();
            assert = (value.indexOf(matchText) === value.length - matchText.length);
        }
        return this.assert(assert,
            this.name + ' ends with ' + matchText,
            this.name + ' does not end with ' + matchText + ' (' + value + ')'
        );
    }

    /**
     * Does this objects type match this?
     *
     * @param {string} type
     */
    public is(type: string): Node {
        let myType: string = Flagpole.toType(this.obj);
        return this.assert((myType == type.toLocaleLowerCase()),
            this.name + ' is type ' + type,
            this.name + ' is not type ' + type + ' (' + myType + ')'
        );
    }

    /**
     * Does this element exist?
     */
    public exists(): Node {
        let exists: boolean = false;
        if (this.isDomElement()) {
            exists = (this.obj.length > 0);
        }
        else if (!this.isNullOrUndefined()) {
            exists = true;
        }
        return this.assert(exists,
            this.name + ' exists',
            this.name + ' does not exist'
        );
    }

    /**
     *  Is this object's value equal to this?
     *
     * @param value
     * @param {boolean} permissiveMatching
     */
    public equals(value: any, permissiveMatching: boolean = false): Node {
        let matchValue: string = this.toString();
        let positiveCase: string = 'equals';
        let negativeCase: string = 'does not equal';
        if (permissiveMatching) {
            value = value.toLowerCase().trim();
            matchValue = matchValue.toLowerCase().trim();
            positiveCase = 'is similar to';
            negativeCase = 'is not similar to';
        }
        return this.assert(matchValue == value,
            this.name + ' ' + positiveCase + ' ' + value,
            this.name + ' ' + negativeCase + ' ' + value + ' (' + matchValue + ')'
        );
    }

    /**
     * Is this object's value similar to this?
     *
     * @param value
     */
    public similarTo(value: any): Node {
        return this.equals(value, true);
    }

}