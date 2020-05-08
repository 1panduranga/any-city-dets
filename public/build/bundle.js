
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Header.svelte generated by Svelte v3.22.2 */

    const file = "src\\components\\Header.svelte";

    function create_fragment(ctx) {
    	let header;
    	let div;
    	let h3;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			header = element("header");
    			div = element("div");
    			h3 = element("h3");
    			if (default_slot) default_slot.c();
    			attr_dev(h3, "class", "svelte-1vzduuy");
    			add_location(h3, file, 2, 1, 18);
    			attr_dev(div, "class", "svelte-1vzduuy");
    			add_location(div, file, 1, 0, 10);
    			attr_dev(header, "class", "svelte-1vzduuy");
    			add_location(header, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div);
    			append_dev(div, h3);

    			if (default_slot) {
    				default_slot.m(h3, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 1) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[0], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Header", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, $$slots];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\components\Footer.svelte generated by Svelte v3.22.2 */

    const file$1 = "src\\components\\Footer.svelte";

    // (6:0) {#if source!=""}
    function create_if_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = /*source*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "city view details ");
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "svelte-nklxyx");
    			add_location(img, file$1, 7, 0, 105);
    			add_location(div, file$1, 6, 0, 98);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*source*/ 1 && img.src !== (img_src_value = /*source*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(6:0) {#if source!=\\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (11:0) {#if copyright!=''}
    function create_if_block(ctx) {
    	let div;
    	let h6;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h6 = element("h6");
    			t = text(/*copyright*/ ctx[1]);
    			add_location(h6, file$1, 12, 0, 230);
    			attr_dev(div, "class", "copyright svelte-nklxyx");
    			add_location(div, file$1, 11, 0, 205);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h6);
    			append_dev(h6, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*copyright*/ 2) set_data_dev(t, /*copyright*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(11:0) {#if copyright!=''}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let footer;
    	let t;
    	let if_block0 = /*source*/ ctx[0] != "" && create_if_block_1(ctx);
    	let if_block1 = /*copyright*/ ctx[1] != "" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr_dev(footer, "class", "svelte-nklxyx");
    			add_location(footer, file$1, 4, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			if (if_block0) if_block0.m(footer, null);
    			append_dev(footer, t);
    			if (if_block1) if_block1.m(footer, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*source*/ ctx[0] != "") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(footer, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*copyright*/ ctx[1] != "") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(footer, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { source = "" } = $$props;
    	let { copyright = "" } = $$props;
    	const writable_props = ["source", "copyright"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Footer", $$slots, []);

    	$$self.$set = $$props => {
    		if ("source" in $$props) $$invalidate(0, source = $$props.source);
    		if ("copyright" in $$props) $$invalidate(1, copyright = $$props.copyright);
    	};

    	$$self.$capture_state = () => ({ source, copyright });

    	$$self.$inject_state = $$props => {
    		if ("source" in $$props) $$invalidate(0, source = $$props.source);
    		if ("copyright" in $$props) $$invalidate(1, copyright = $$props.copyright);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [source, copyright];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { source: 0, copyright: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get source() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set source(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get copyright() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set copyright(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Search.svelte generated by Svelte v3.22.2 */
    const file$2 = "src\\components\\Search.svelte";

    function create_fragment$2(ctx) {
    	let form;
    	let h6;
    	let t0;
    	let br;
    	let t1;
    	let div;
    	let input;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			form = element("form");
    			h6 = element("h6");
    			if (default_slot) default_slot.c();
    			t0 = space();
    			br = element("br");
    			t1 = space();
    			div = element("div");
    			input = element("input");
    			add_location(h6, file$2, 12, 0, 303);
    			add_location(br, file$2, 15, 0, 331);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "name", "search");
    			attr_dev(input, "placeholder", /*holder*/ ctx[0]);
    			attr_dev(input, "class", "browser-default svelte-dke3rn");
    			attr_dev(input, "spellcheck", "false");
    			input.required = "true";
    			attr_dev(input, "autocomplete", "off");
    			add_location(input, file$2, 17, 0, 344);
    			attr_dev(div, "class", "svelte-dke3rn");
    			add_location(div, file$2, 16, 0, 337);
    			attr_dev(form, "class", "svelte-dke3rn");
    			add_location(form, file$2, 10, 0, 253);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, form, anchor);
    			append_dev(form, h6);

    			if (default_slot) {
    				default_slot.m(h6, null);
    			}

    			append_dev(form, t0);
    			append_dev(form, br);
    			append_dev(form, t1);
    			append_dev(form, div);
    			append_dev(div, input);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[1]), false, true, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[3], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null));
    				}
    			}

    			if (!current || dirty & /*holder*/ 1) {
    				attr_dev(input, "placeholder", /*holder*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let dispatch = createEventDispatcher();
    	let { holder = "" } = $$props;

    	const handleSubmit = e => {
    		dispatch("gotSearch", e.target.elements[0].value.trim().toLowerCase());
    		e.target.reset();
    	};

    	const writable_props = ["holder"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Search", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("holder" in $$props) $$invalidate(0, holder = $$props.holder);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		holder,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ("dispatch" in $$props) dispatch = $$props.dispatch;
    		if ("holder" in $$props) $$invalidate(0, holder = $$props.holder);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [holder, handleSubmit, dispatch, $$scope, $$slots];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { holder: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get holder() {
    		throw new Error("<Search>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set holder(value) {
    		throw new Error("<Search>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Card.svelte generated by Svelte v3.22.2 */

    const file$3 = "src\\components\\Card.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let h5;
    	let t0;
    	let t1;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[2].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[1], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h5 = element("h5");
    			t0 = text(/*cardtitle*/ ctx[0]);
    			t1 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(h5, "class", "title svelte-137dux");
    			add_location(h5, file$3, 4, 0, 67);
    			attr_dev(div, "class", "card svelte-137dux");
    			add_location(div, file$3, 3, 0, 47);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h5);
    			append_dev(h5, t0);
    			append_dev(div, t1);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*cardtitle*/ 1) set_data_dev(t0, /*cardtitle*/ ctx[0]);

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 2) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[1], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[1], dirty, null));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { cardtitle = "" } = $$props;
    	const writable_props = ["cardtitle"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Card", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("cardtitle" in $$props) $$invalidate(0, cardtitle = $$props.cardtitle);
    		if ("$$scope" in $$props) $$invalidate(1, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ cardtitle });

    	$$self.$inject_state = $$props => {
    		if ("cardtitle" in $$props) $$invalidate(0, cardtitle = $$props.cardtitle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cardtitle, $$scope, $$slots];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { cardtitle: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get cardtitle() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cardtitle(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Loader.svelte generated by Svelte v3.22.2 */

    const file$4 = "src\\components\\Loader.svelte";

    function create_fragment$4(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "loader svelte-o152g0");
    			set_style(div0, "border-top", /*width*/ ctx[1] + "px solid " + /*color*/ ctx[0]);
    			set_style(div0, "border-width", /*width*/ ctx[1] + "px");
    			set_style(div0, "width", /*size*/ ctx[2] + "px");
    			set_style(div0, "height", /*size*/ ctx[2] + "px");
    			add_location(div0, file$4, 6, 0, 116);
    			attr_dev(div1, "class", "wrapper");
    			add_location(div1, file$4, 5, 0, 93);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*width, color*/ 3) {
    				set_style(div0, "border-top", /*width*/ ctx[1] + "px solid " + /*color*/ ctx[0]);
    			}

    			if (dirty & /*width*/ 2) {
    				set_style(div0, "border-width", /*width*/ ctx[1] + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div0, "width", /*size*/ ctx[2] + "px");
    			}

    			if (dirty & /*size*/ 4) {
    				set_style(div0, "height", /*size*/ ctx[2] + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { color = "tomato" } = $$props;
    	let { width = "5" } = $$props;
    	let { size = 50 } = $$props;
    	const writable_props = ["color", "width", "size"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Loader> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Loader", $$slots, []);

    	$$self.$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    	};

    	$$self.$capture_state = () => ({ color, width, size });

    	$$self.$inject_state = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("width" in $$props) $$invalidate(1, width = $$props.width);
    		if ("size" in $$props) $$invalidate(2, size = $$props.size);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [color, width, size];
    }

    class Loader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { color: 0, width: 1, size: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loader",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get color() {
    		throw new Error("<Loader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Loader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Loader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Loader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Loader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Loader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Weather.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file$5 = "src\\components\\Weather.svelte";

    // (49:0) {:else}
    function create_else_block_1(ctx) {
    	let current;

    	const loader = new Loader({
    			props: { color: "brown" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(49:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (29:0) {#if WeatherIcon!=""}
    function create_if_block$1(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let img;
    	let img_src_value;
    	let t1;
    	let div2;
    	let h6;
    	let t2;
    	let t3;
    	let h5;
    	let t4;
    	let t5;

    	function select_block_type_1(ctx, dirty) {
    		if (/*day*/ ctx[3] == true) return create_if_block_1$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			div1 = element("div");
    			img = element("img");
    			t1 = space();
    			div2 = element("div");
    			h6 = element("h6");
    			t2 = text(/*WeatherText*/ ctx[0]);
    			t3 = space();
    			h5 = element("h5");
    			t4 = text(/*Temperature*/ ctx[1]);
    			t5 = text(" °C");
    			attr_dev(div0, "class", "pic svelte-iqkgm8");
    			add_location(div0, file$5, 29, 4, 737);
    			if (img.src !== (img_src_value = /*WeatherIcon*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "weather icon");
    			attr_dev(img, "class", "svelte-iqkgm8");
    			add_location(img, file$5, 38, 4, 976);
    			attr_dev(div1, "class", "icon svelte-iqkgm8");
    			add_location(div1, file$5, 37, 4, 952);
    			attr_dev(h6, "class", "center");
    			add_location(h6, file$5, 41, 4, 1063);
    			add_location(h5, file$5, 44, 4, 1118);
    			attr_dev(div2, "class", "details svelte-iqkgm8");
    			add_location(div2, file$5, 40, 4, 1036);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			if_block.m(div0, null);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h6);
    			append_dev(h6, t2);
    			append_dev(div2, t3);
    			append_dev(div2, h5);
    			append_dev(h5, t4);
    			append_dev(h5, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*WeatherIcon*/ 4 && img.src !== (img_src_value = /*WeatherIcon*/ ctx[2])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*WeatherText*/ 1) set_data_dev(t2, /*WeatherText*/ ctx[0]);
    			if (dirty & /*Temperature*/ 2) set_data_dev(t4, /*Temperature*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if_block.d();
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(29:0) {#if WeatherIcon!=\\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    // (33:4) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "./img/night.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "night or evening time sky");
    			attr_dev(img, "class", "svelte-iqkgm8");
    			add_location(img, file$5, 33, 4, 862);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(33:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (31:4) {#if day==true}
    function create_if_block_1$1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = "./img/day.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "day, morning or afternoon time");
    			attr_dev(img, "class", "svelte-iqkgm8");
    			add_location(img, file$5, 31, 4, 781);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(31:4) {#if day==true}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*WeatherIcon*/ ctx[2] != "") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "wrapper svelte-iqkgm8");
    			add_location(div, file$5, 26, 0, 685);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { accu_key } = $$props;
    	let { search_code } = $$props;
    	let WeatherText = "";
    	let Temperature = "";
    	let WeatherIcon = "";
    	let day = "";

    	const get_weather = async search_code => {
    		const response = await fetch(`https://dataservice.accuweather.com/currentconditions/v1/${search_code}?apikey=${accu_key}`);
    		let data = await response.json();
    		return data;
    	};

    	get_weather(search_code).then(data => {
    		data = data[0];
    		$$invalidate(0, WeatherText = data.WeatherText);
    		$$invalidate(1, Temperature = data.Temperature.Metric.Value);
    		$$invalidate(2, WeatherIcon = `./img/icons/${data.WeatherIcon}.svg`);
    		$$invalidate(3, day = data.IsDayTime);
    	}).catch(err => {
    		console.log(err);
    	});

    	const writable_props = ["accu_key", "search_code"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Weather> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Weather", $$slots, []);

    	$$self.$set = $$props => {
    		if ("accu_key" in $$props) $$invalidate(4, accu_key = $$props.accu_key);
    		if ("search_code" in $$props) $$invalidate(5, search_code = $$props.search_code);
    	};

    	$$self.$capture_state = () => ({
    		accu_key,
    		search_code,
    		Loader,
    		WeatherText,
    		Temperature,
    		WeatherIcon,
    		day,
    		get_weather
    	});

    	$$self.$inject_state = $$props => {
    		if ("accu_key" in $$props) $$invalidate(4, accu_key = $$props.accu_key);
    		if ("search_code" in $$props) $$invalidate(5, search_code = $$props.search_code);
    		if ("WeatherText" in $$props) $$invalidate(0, WeatherText = $$props.WeatherText);
    		if ("Temperature" in $$props) $$invalidate(1, Temperature = $$props.Temperature);
    		if ("WeatherIcon" in $$props) $$invalidate(2, WeatherIcon = $$props.WeatherIcon);
    		if ("day" in $$props) $$invalidate(3, day = $$props.day);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [WeatherText, Temperature, WeatherIcon, day, accu_key, search_code];
    }

    class Weather extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { accu_key: 4, search_code: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Weather",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*accu_key*/ ctx[4] === undefined && !("accu_key" in props)) {
    			console_1.warn("<Weather> was created without expected prop 'accu_key'");
    		}

    		if (/*search_code*/ ctx[5] === undefined && !("search_code" in props)) {
    			console_1.warn("<Weather> was created without expected prop 'search_code'");
    		}
    	}

    	get accu_key() {
    		throw new Error("<Weather>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set accu_key(value) {
    		throw new Error("<Weather>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get search_code() {
    		throw new Error("<Weather>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set search_code(value) {
    		throw new Error("<Weather>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Time.svelte generated by Svelte v3.22.2 */
    const file$6 = "src\\components\\Time.svelte";

    // (54:0) {:else}
    function create_else_block$1(ctx) {
    	let current;

    	const loader = new Loader({
    			props: { color: "brown" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(54:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (47:0) {#if H!=undefined}
    function create_if_block$2(ctx) {
    	let h4;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let h6;
    	let t6;

    	const block = {
    		c: function create() {
    			h4 = element("h4");
    			t0 = text(/*H*/ ctx[1]);
    			t1 = text(":");
    			t2 = text(/*M*/ ctx[2]);
    			t3 = text(":");
    			t4 = text(/*S*/ ctx[3]);
    			t5 = space();
    			h6 = element("h6");
    			t6 = text(/*date*/ ctx[0]);
    			add_location(h4, file$6, 47, 0, 1035);
    			add_location(h6, file$6, 50, 0, 1061);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h4, anchor);
    			append_dev(h4, t0);
    			append_dev(h4, t1);
    			append_dev(h4, t2);
    			append_dev(h4, t3);
    			append_dev(h4, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h6, anchor);
    			append_dev(h6, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*H*/ 2) set_data_dev(t0, /*H*/ ctx[1]);
    			if (dirty & /*M*/ 4) set_data_dev(t2, /*M*/ ctx[2]);
    			if (dirty & /*S*/ 8) set_data_dev(t4, /*S*/ ctx[3]);
    			if (dirty & /*date*/ 1) set_data_dev(t6, /*date*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(47:0) {#if H!=undefined}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*H*/ ctx[1] != undefined) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "time svelte-dpc3jo");
    			add_location(div, file$6, 44, 0, 993);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { timezone = "" } = $$props;
    	let time = "";
    	let date = "";
    	let H, M, S;
    	let d;

    	const get_time = async timezone => {
    		$$invalidate(5, time = "");
    		const response = await fetch(`https://worldtimeapi.org/api/timezone/${timezone}.txt`);
    		let data = await response.text();
    		return data;
    	};

    	get_time(timezone).then(data => {
    		$$invalidate(0, date = data.slice(data.search("datetime") + 10, data.search("datetime") + 20));
    		$$invalidate(5, time = data.slice(data.search("datetime") + 21, data.search("datetime") + 29));
    	});

    	const writable_props = ["timezone"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Time> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Time", $$slots, []);

    	$$self.$set = $$props => {
    		if ("timezone" in $$props) $$invalidate(4, timezone = $$props.timezone);
    	};

    	$$self.$capture_state = () => ({
    		Loader,
    		timezone,
    		time,
    		date,
    		H,
    		M,
    		S,
    		d,
    		get_time
    	});

    	$$self.$inject_state = $$props => {
    		if ("timezone" in $$props) $$invalidate(4, timezone = $$props.timezone);
    		if ("time" in $$props) $$invalidate(5, time = $$props.time);
    		if ("date" in $$props) $$invalidate(0, date = $$props.date);
    		if ("H" in $$props) $$invalidate(1, H = $$props.H);
    		if ("M" in $$props) $$invalidate(2, M = $$props.M);
    		if ("S" in $$props) $$invalidate(3, S = $$props.S);
    		if ("d" in $$props) $$invalidate(6, d = $$props.d);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*date*/ 1) ;

    		if ($$self.$$.dirty & /*time, d*/ 96) {
    			 {
    				if (time != "") {
    					$$invalidate(6, d = new Date());
    					d.setHours(time.slice(0, 2));
    					d.setMinutes(time.slice(3, 5));
    					d.setSeconds(time.slice(6, 8));

    					const stop = setInterval(
    						() => {
    							//  if(i==0)
    							//  clearInterval(stop);
    							d.setSeconds(d.getSeconds() + 1);

    							$$invalidate(1, H = d.getHours());
    							$$invalidate(2, M = d.getMinutes());
    							$$invalidate(3, S = d.getSeconds());
    						},
    						1000
    					);
    				}
    			} // console.log("changed")
    		}
    	};

    	return [date, H, M, S, timezone];
    }

    class Time extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { timezone: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Time",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get timezone() {
    		throw new Error("<Time>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set timezone(value) {
    		throw new Error("<Time>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Location.svelte generated by Svelte v3.22.2 */
    const file$7 = "src\\components\\Location.svelte";

    // (40:0) {:else}
    function create_else_block$2(ctx) {
    	let current;

    	const loader = new Loader({
    			props: { color: "brown" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(40:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (38:0) {#if flag!=''}
    function create_if_block$3(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*flag*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			attr_dev(img, "draggable", "false");
    			attr_dev(img, "class", "svelte-b8bpdo");
    			add_location(img, file$7, 38, 0, 584);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*flag*/ 2 && img.src !== (img_src_value = /*flag*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(38:0) {#if flag!=''}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div2;
    	let div0;
    	let span1;
    	let span0;
    	let t0_value = /*data*/ ctx[0]["AdministrativeArea"]["LocalizedType"] + "";
    	let t0;
    	let t1;
    	let t2;
    	let t3_value = /*data*/ ctx[0]["AdministrativeArea"]["EnglishName"] + "";
    	let t3;
    	let t4;
    	let br0;
    	let t5;
    	let span3;
    	let span2;
    	let t7;
    	let t8_value = /*data*/ ctx[0]["Country"]["EnglishName"] + "";
    	let t8;
    	let t9;
    	let br1;
    	let t10;
    	let span5;
    	let span4;
    	let t12;
    	let t13_value = /*data*/ ctx[0]["Region"]["EnglishName"] + "";
    	let t13;
    	let t14;
    	let br2;
    	let t15;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*flag*/ ctx[1] != "") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			span1 = element("span");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = text(" :");
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = space();
    			br0 = element("br");
    			t5 = space();
    			span3 = element("span");
    			span2 = element("span");
    			span2.textContent = "country :";
    			t7 = space();
    			t8 = text(t8_value);
    			t9 = space();
    			br1 = element("br");
    			t10 = space();
    			span5 = element("span");
    			span4 = element("span");
    			span4.textContent = "continent :";
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			br2 = element("br");
    			t15 = space();
    			div1 = element("div");
    			if_block.c();
    			attr_dev(span0, "class", "b svelte-b8bpdo");
    			add_location(span0, file$7, 9, 0, 173);
    			attr_dev(span1, "class", "ele svelte-b8bpdo");
    			add_location(span1, file$7, 8, 0, 153);
    			add_location(br0, file$7, 15, 0, 307);
    			attr_dev(span2, "class", "b svelte-b8bpdo");
    			add_location(span2, file$7, 18, 0, 335);
    			attr_dev(span3, "class", "ele svelte-b8bpdo");
    			add_location(span3, file$7, 17, 0, 315);
    			add_location(br1, file$7, 24, 0, 419);
    			attr_dev(span4, "class", "b svelte-b8bpdo");
    			add_location(span4, file$7, 27, 0, 447);
    			attr_dev(span5, "class", "ele svelte-b8bpdo");
    			add_location(span5, file$7, 26, 0, 427);
    			attr_dev(div0, "class", "co_wrapper svelte-b8bpdo");
    			add_location(div0, file$7, 7, 0, 127);
    			add_location(br2, file$7, 35, 0, 542);
    			attr_dev(div1, "class", "flag svelte-b8bpdo");
    			add_location(div1, file$7, 36, 0, 548);
    			attr_dev(div2, "class", "wrapper svelte-b8bpdo");
    			add_location(div2, file$7, 6, 0, 104);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span1);
    			append_dev(span1, span0);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(div0, t4);
    			append_dev(div0, br0);
    			append_dev(div0, t5);
    			append_dev(div0, span3);
    			append_dev(span3, span2);
    			append_dev(span3, t7);
    			append_dev(span3, t8);
    			append_dev(div0, t9);
    			append_dev(div0, br1);
    			append_dev(div0, t10);
    			append_dev(div0, span5);
    			append_dev(span5, span4);
    			append_dev(span5, t12);
    			append_dev(span5, t13);
    			append_dev(div2, t14);
    			append_dev(div2, br2);
    			append_dev(div2, t15);
    			append_dev(div2, div1);
    			if_blocks[current_block_type_index].m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*data*/ 1) && t0_value !== (t0_value = /*data*/ ctx[0]["AdministrativeArea"]["LocalizedType"] + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*data*/ 1) && t3_value !== (t3_value = /*data*/ ctx[0]["AdministrativeArea"]["EnglishName"] + "")) set_data_dev(t3, t3_value);
    			if ((!current || dirty & /*data*/ 1) && t8_value !== (t8_value = /*data*/ ctx[0]["Country"]["EnglishName"] + "")) set_data_dev(t8, t8_value);
    			if ((!current || dirty & /*data*/ 1) && t13_value !== (t13_value = /*data*/ ctx[0]["Region"]["EnglishName"] + "")) set_data_dev(t13, t13_value);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div1, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { data = "" } = $$props;
    	let { flag = "" } = $$props;
    	const writable_props = ["data", "flag"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Location> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Location", $$slots, []);

    	$$self.$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("flag" in $$props) $$invalidate(1, flag = $$props.flag);
    	};

    	$$self.$capture_state = () => ({ data, flag, Loader });

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("flag" in $$props) $$invalidate(1, flag = $$props.flag);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, flag];
    }

    class Location extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { data: 0, flag: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Location",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get data() {
    		throw new Error("<Location>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Location>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flag() {
    		throw new Error("<Location>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flag(value) {
    		throw new Error("<Location>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Currency.svelte generated by Svelte v3.22.2 */

    const file$8 = "src\\components\\Currency.svelte";

    // (4:0) {#if worlddata!=undefined}
    function create_if_block$4(ctx) {
    	let div2;
    	let div0;
    	let t0_value = /*worlddata*/ ctx[0][0]["currencies"][0]["symbol"] + "";
    	let t0;
    	let t1;
    	let div1;
    	let t2_value = /*worlddata*/ ctx[0][0]["currencies"][0]["name"] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			t2 = text(t2_value);
    			add_location(div0, file$8, 5, 0, 99);
    			add_location(div1, file$8, 8, 0, 157);
    			attr_dev(div2, "class", "currency svelte-1rvliyt");
    			add_location(div2, file$8, 4, 0, 75);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*worlddata*/ 1 && t0_value !== (t0_value = /*worlddata*/ ctx[0][0]["currencies"][0]["symbol"] + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*worlddata*/ 1 && t2_value !== (t2_value = /*worlddata*/ ctx[0][0]["currencies"][0]["name"] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(4:0) {#if worlddata!=undefined}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let if_block_anchor;
    	let if_block = /*worlddata*/ ctx[0] != undefined && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*worlddata*/ ctx[0] != undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { worlddata = "" } = $$props;
    	const writable_props = ["worlddata"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Currency> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Currency", $$slots, []);

    	$$self.$set = $$props => {
    		if ("worlddata" in $$props) $$invalidate(0, worlddata = $$props.worlddata);
    	};

    	$$self.$capture_state = () => ({ worlddata });

    	$$self.$inject_state = $$props => {
    		if ("worlddata" in $$props) $$invalidate(0, worlddata = $$props.worlddata);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [worlddata];
    }

    class Currency extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { worlddata: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Currency",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get worlddata() {
    		throw new Error("<Currency>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set worlddata(value) {
    		throw new Error("<Currency>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Language.svelte generated by Svelte v3.22.2 */

    const file$9 = "src\\components\\Language.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (39:0) {#each langset as lang}
    function create_each_block(ctx) {
    	let div;
    	let t0_value = /*lang*/ ctx[4] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "language svelte-1pxlqmy");
    			add_location(div, file$9, 39, 0, 1114);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*langset*/ 1 && t0_value !== (t0_value = /*lang*/ ctx[4] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(39:0) {#each langset as lang}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let each_1_anchor;
    	let each_value = /*langset*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*langset*/ 1) {
    				each_value = /*langset*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { worlddata } = $$props;
    	let { locationdata = "" } = $$props;
    	const writable_props = ["worlddata", "locationdata"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Language> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Language", $$slots, []);

    	$$self.$set = $$props => {
    		if ("worlddata" in $$props) $$invalidate(1, worlddata = $$props.worlddata);
    		if ("locationdata" in $$props) $$invalidate(2, locationdata = $$props.locationdata);
    	};

    	$$self.$capture_state = () => ({
    		worlddata,
    		locationdata,
    		langset,
    		languages
    	});

    	$$self.$inject_state = $$props => {
    		if ("worlddata" in $$props) $$invalidate(1, worlddata = $$props.worlddata);
    		if ("locationdata" in $$props) $$invalidate(2, locationdata = $$props.locationdata);
    		if ("langset" in $$props) $$invalidate(0, langset = $$props.langset);
    		if ("languages" in $$props) $$invalidate(3, languages = $$props.languages);
    	};

    	let langset;
    	let languages;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*worlddata*/ 2) {
    			 $$invalidate(3, languages = worlddata[0]["languages"]);
    		}

    		if ($$self.$$.dirty & /*languages, langset, locationdata*/ 13) {
    			 {
    				languages.forEach(language => {
    					$$invalidate(0, langset = [...langset, language["name"]]);
    				});

    				if (locationdata["AdministrativeArea"]["EnglishName"] == "Andhra Pradesh" || locationdata["AdministrativeArea"]["EnglishName"] == "Telangana") {
    					$$invalidate(0, langset = ["Telugu", ...langset]);
    				} else if (locationdata["AdministrativeArea"]["EnglishName"] == "Tamil Nadu") {
    					$$invalidate(0, langset = ["Tamil", ...langset]);
    				} else if (locationdata["AdministrativeArea"]["EnglishName"] == "Kerala") {
    					$$invalidate(0, langset = ["Malayalam", ...langset]);
    				} else if (locationdata["AdministrativeArea"]["EnglishName"] == "Maharashtra") {
    					$$invalidate(0, langset = ["Marathi", ...langset]);
    				} else if (locationdata["AdministrativeArea"]["EnglishName"] == "Karnataka") {
    					$$invalidate(0, langset = ["Kannada", ...langset]);
    				} else if (locationdata["AdministrativeArea"]["EnglishName"] == "Gujarat") {
    					$$invalidate(0, langset = ["Gujarathi", ...langset]);
    				}
    			}
    		}
    	};

    	 $$invalidate(0, langset = []);
    	return [langset, worlddata, locationdata];
    }

    class Language extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { worlddata: 1, locationdata: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Language",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*worlddata*/ ctx[1] === undefined && !("worlddata" in props)) {
    			console.warn("<Language> was created without expected prop 'worlddata'");
    		}
    	}

    	get worlddata() {
    		throw new Error("<Language>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set worlddata(value) {
    		throw new Error("<Language>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get locationdata() {
    		throw new Error("<Language>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set locationdata(value) {
    		throw new Error("<Language>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.22.2 */

    const { console: console_1$1 } = globals;
    const file$a = "src\\App.svelte";

    // (90:0) <Header>
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Any City Dets");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(90:0) <Header>",
    		ctx
    	});

    	return block;
    }

    // (99:1) {#if search!=''}
    function create_if_block$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$2, create_else_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*show*/ ctx[0] == true) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(99:1) {#if search!=''}",
    		ctx
    	});

    	return block;
    }

    // (153:1) {:else}
    function create_else_block_1$1(ctx) {
    	let current;

    	const loader = new Loader({
    			props: { color: "brown" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(153:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (100:1) {#if show==true}
    function create_if_block_1$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_2, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*search_code*/ ctx[5] == "") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(100:1) {#if show==true}",
    		ctx
    	});

    	return block;
    }

    // (106:2) {:else}
    function create_else_block$3(ctx) {
    	let h6;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div5;
    	let div3;
    	let div2;
    	let div0;
    	let t4;
    	let div1;
    	let t5;
    	let div4;
    	let t6;
    	let t7;
    	let div6;
    	let a;
    	let t8;
    	let t9;
    	let current;

    	const card0 = new Card({
    			props: {
    				cardtitle: "Time and Date",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const card1 = new Card({
    			props: {
    				cardtitle: "Location",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const weather = new Weather({
    			props: {
    				accu_key: /*accu_key*/ ctx[8],
    				search_code: /*search_code*/ ctx[5]
    			},
    			$$inline: true
    		});

    	let if_block = /*worlddata*/ ctx[6] != "" && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			h6 = element("h6");
    			t0 = text("Search results related to ");
    			t1 = text(/*search*/ ctx[4]);
    			t2 = text(".");
    			t3 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(card0.$$.fragment);
    			t4 = space();
    			div1 = element("div");
    			create_component(card1.$$.fragment);
    			t5 = space();
    			div4 = element("div");
    			create_component(weather.$$.fragment);
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			div6 = element("div");
    			a = element("a");
    			t8 = text("wikipedia of ");
    			t9 = text(/*search*/ ctx[4]);
    			attr_dev(h6, "class", "heading svelte-1184irg");
    			add_location(h6, file$a, 106, 12, 2363);
    			attr_dev(div0, "class", "col l12 s12");
    			add_location(div0, file$a, 113, 5, 2522);
    			attr_dev(div1, "class", "col l12 s12");
    			add_location(div1, file$a, 118, 5, 2644);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$a, 112, 4, 2499);
    			attr_dev(div3, "class", "col l4 s12 offset-l1");
    			add_location(div3, file$a, 111, 4, 2460);
    			attr_dev(div4, "class", "col l5 s12 offset-l2");
    			add_location(div4, file$a, 126, 4, 2802);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$a, 110, 3, 2438);
    			attr_dev(a, "href", /*link*/ ctx[3]);
    			attr_dev(a, "target", "_blank");
    			set_style(a, "text-decoration", "none");
    			set_style(a, "heigth", "fit-content");
    			add_location(a, file$a, 148, 3, 3266);
    			attr_dev(div6, "class", "btn white wiki svelte-1184irg");
    			add_location(div6, file$a, 147, 3, 3234);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h6, anchor);
    			append_dev(h6, t0);
    			append_dev(h6, t1);
    			append_dev(h6, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			mount_component(card0, div0, null);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			mount_component(card1, div1, null);
    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			mount_component(weather, div4, null);
    			insert_dev(target, t6, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, a);
    			append_dev(a, t8);
    			append_dev(a, t9);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*search*/ 16) set_data_dev(t1, /*search*/ ctx[4]);
    			const card0_changes = {};

    			if (dirty & /*$$scope, timezone*/ 4100) {
    				card0_changes.$$scope = { dirty, ctx };
    			}

    			card0.$set(card0_changes);
    			const card1_changes = {};

    			if (dirty & /*$$scope, locationdata, flag*/ 4226) {
    				card1_changes.$$scope = { dirty, ctx };
    			}

    			card1.$set(card1_changes);
    			const weather_changes = {};
    			if (dirty & /*search_code*/ 32) weather_changes.search_code = /*search_code*/ ctx[5];
    			weather.$set(weather_changes);

    			if (/*worlddata*/ ctx[6] != "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*worlddata*/ 64) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t7.parentNode, t7);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*search*/ 16) set_data_dev(t9, /*search*/ ctx[4]);

    			if (!current || dirty & /*link*/ 8) {
    				attr_dev(a, "href", /*link*/ ctx[3]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card0.$$.fragment, local);
    			transition_in(card1.$$.fragment, local);
    			transition_in(weather.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card0.$$.fragment, local);
    			transition_out(card1.$$.fragment, local);
    			transition_out(weather.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h6);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div5);
    			destroy_component(card0);
    			destroy_component(card1);
    			destroy_component(weather);
    			if (detaching) detach_dev(t6);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(106:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (101:2) {#if search_code==''}
    function create_if_block_2(ctx) {
    	let h6;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			h6 = element("h6");
    			t0 = text("Seems like there's no city named ");
    			t1 = text(/*search*/ ctx[4]);
    			add_location(h6, file$a, 101, 6, 2275);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h6, anchor);
    			append_dev(h6, t0);
    			append_dev(h6, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*search*/ 16) set_data_dev(t1, /*search*/ ctx[4]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(101:2) {#if search_code==''}",
    		ctx
    	});

    	return block;
    }

    // (115:6) <Card cardtitle="Time and Date">
    function create_default_slot_3(ctx) {
    	let current;

    	const time = new Time({
    			props: { timezone: /*timezone*/ ctx[2] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(time.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(time, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const time_changes = {};
    			if (dirty & /*timezone*/ 4) time_changes.timezone = /*timezone*/ ctx[2];
    			time.$set(time_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(time.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(time.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(time, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(115:6) <Card cardtitle=\\\"Time and Date\\\">",
    		ctx
    	});

    	return block;
    }

    // (120:6) <Card cardtitle="Location">
    function create_default_slot_2(ctx) {
    	let current;

    	const location = new Location({
    			props: {
    				data: /*locationdata*/ ctx[1],
    				flag: /*flag*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(location.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(location, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const location_changes = {};
    			if (dirty & /*locationdata*/ 2) location_changes.data = /*locationdata*/ ctx[1];
    			if (dirty & /*flag*/ 128) location_changes.flag = /*flag*/ ctx[7];
    			location.$set(location_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(location.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(location.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(location, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(120:6) <Card cardtitle=\\\"Location\\\">",
    		ctx
    	});

    	return block;
    }

    // (132:3) {#if worlddata!=''}
    function create_if_block_3(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let current;

    	const card0 = new Card({
    			props: {
    				cardtitle: "Currency",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const card1 = new Card({
    			props: {
    				cardtitle: "Languages",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(card0.$$.fragment);
    			t = space();
    			div1 = element("div");
    			create_component(card1.$$.fragment);
    			attr_dev(div0, "class", "col l4 s12 offset-l1");
    			add_location(div0, file$a, 133, 4, 2948);
    			attr_dev(div1, "class", "col l4 s12 offset-l2");
    			add_location(div1, file$a, 139, 4, 3072);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$a, 132, 4, 2926);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(card0, div0, null);
    			append_dev(div2, t);
    			append_dev(div2, div1);
    			mount_component(card1, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const card0_changes = {};

    			if (dirty & /*$$scope, worlddata*/ 4160) {
    				card0_changes.$$scope = { dirty, ctx };
    			}

    			card0.$set(card0_changes);
    			const card1_changes = {};

    			if (dirty & /*$$scope, worlddata, locationdata*/ 4162) {
    				card1_changes.$$scope = { dirty, ctx };
    			}

    			card1.$set(card1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card0.$$.fragment, local);
    			transition_in(card1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card0.$$.fragment, local);
    			transition_out(card1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(card0);
    			destroy_component(card1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(132:3) {#if worlddata!=''}",
    		ctx
    	});

    	return block;
    }

    // (135:4) <Card cardtitle="Currency">
    function create_default_slot_1(ctx) {
    	let current;

    	const currency = new Currency({
    			props: { worlddata: /*worlddata*/ ctx[6] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(currency.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(currency, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const currency_changes = {};
    			if (dirty & /*worlddata*/ 64) currency_changes.worlddata = /*worlddata*/ ctx[6];
    			currency.$set(currency_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(currency.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(currency.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(currency, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(135:4) <Card cardtitle=\\\"Currency\\\">",
    		ctx
    	});

    	return block;
    }

    // (141:4) <Card cardtitle="Languages">
    function create_default_slot(ctx) {
    	let current;

    	const language = new Language({
    			props: {
    				worlddata: /*worlddata*/ ctx[6],
    				locationdata: /*locationdata*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(language.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(language, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const language_changes = {};
    			if (dirty & /*worlddata*/ 64) language_changes.worlddata = /*worlddata*/ ctx[6];
    			if (dirty & /*locationdata*/ 2) language_changes.locationdata = /*locationdata*/ ctx[1];
    			language.$set(language_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(language.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(language.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(language, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(141:4) <Card cardtitle=\\\"Languages\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let t0;
    	let main;
    	let t1;
    	let div;
    	let t2;
    	let current;

    	const header = new Header({
    			props: {
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const search_1 = new Search({
    			props: { holder: "search a city" },
    			$$inline: true
    		});

    	search_1.$on("gotSearch", /*gotSearch*/ ctx[9]);
    	let if_block = /*search*/ ctx[4] != "" && create_if_block$5(ctx);

    	const footer = new Footer({
    			props: { source: "./img/city.svg" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(header.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(search_1.$$.fragment);
    			t1 = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			t2 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div, "class", "tot_wrapper svelte-1184irg");
    			add_location(div, file$a, 97, 0, 2183);
    			attr_dev(main, "class", "svelte-1184irg");
    			add_location(main, file$a, 93, 0, 2106);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(search_1, main, null);
    			append_dev(main, t1);
    			append_dev(main, div);
    			if (if_block) if_block.m(div, null);
    			insert_dev(target, t2, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const header_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				header_changes.$$scope = { dirty, ctx };
    			}

    			header.$set(header_changes);
    			const search_1_changes = {};

    			if (dirty & /*$$scope*/ 4096) {
    				search_1_changes.$$scope = { dirty, ctx };
    			}

    			search_1.$set(search_1_changes);

    			if (/*search*/ ctx[4] != "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*search*/ 16) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(search_1.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(search_1.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(header, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(search_1);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t2);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let show = false;
    	let accu_key = "o8lkJuEjhlMXiH8EiHt8Z6F7AxQSJJ17";
    	let locationdata;
    	let timezone;

    	const worldapi = async () => {
    		let country = locationdata["Country"]["EnglishName"];

    		if (country == "United States") {
    			country = "United States of America";
    		} else if (country == "South Korea") {
    			country = "Republic%20of%20Korea";
    		} else if (country == "Vietnam") {
    			country = "viet nam";
    		} else if (country == "Russia") {
    			country = "Russian Federation";
    		}

    		const response = await fetch(`https://restcountries.eu/rest/v2/name/${country}?fullText=true`);
    		$$invalidate(6, worlddata = await response.json());
    		return worlddata[0];
    	};

    	const gotSearch = e => {
    		$$invalidate(6, worlddata = "");
    		$$invalidate(7, flag = "");
    		$$invalidate(4, search = e.detail);
    		$$invalidate(0, show = false);

    		getaccudetails(search).then(data => {
    			$$invalidate(1, locationdata = data);
    			$$invalidate(0, show = true);

    			if (data === undefined) {
    				$$invalidate(5, search_code = "");
    			} else {
    				$$invalidate(5, search_code = data["Key"]);
    				$$invalidate(2, timezone = data["TimeZone"]["Name"]);
    			}

    			worldapi().then(data => {
    				$$invalidate(7, flag = data["flag"]);
    			}).catch(err => {
    				console.log(err);
    			});
    		}).catch(err => {
    			$$invalidate(0, show = true);
    			console.log(err);
    		});
    	};

    	const getaccudetails = async search => {
    		let base = "https://dataservice.accuweather.com/locations/v1/cities/search";
    		let query = `?apikey=${accu_key}&q=${search}`;
    		const response = await fetch(base + query);
    		let data = await response.json();
    		data = data[0];
    		return data;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		Header,
    		Footer,
    		Search,
    		Card,
    		Loader,
    		Weather,
    		Time,
    		Location,
    		Currency,
    		Language,
    		show,
    		accu_key,
    		locationdata,
    		timezone,
    		worldapi,
    		gotSearch,
    		getaccudetails,
    		link,
    		search,
    		search_code,
    		worlddata,
    		flag
    	});

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("accu_key" in $$props) $$invalidate(8, accu_key = $$props.accu_key);
    		if ("locationdata" in $$props) $$invalidate(1, locationdata = $$props.locationdata);
    		if ("timezone" in $$props) $$invalidate(2, timezone = $$props.timezone);
    		if ("link" in $$props) $$invalidate(3, link = $$props.link);
    		if ("search" in $$props) $$invalidate(4, search = $$props.search);
    		if ("search_code" in $$props) $$invalidate(5, search_code = $$props.search_code);
    		if ("worlddata" in $$props) $$invalidate(6, worlddata = $$props.worlddata);
    		if ("flag" in $$props) $$invalidate(7, flag = $$props.flag);
    	};

    	let link;
    	let search;
    	let search_code;
    	let worlddata;
    	let flag;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*search*/ 16) {
    			 $$invalidate(3, link = "https://en.wikipedia.org/wiki/" + search);
    		}
    	};

    	 $$invalidate(4, search = "");
    	 $$invalidate(5, search_code = "");
    	 $$invalidate(6, worlddata = "");
    	 $$invalidate(7, flag = "");

    	return [
    		show,
    		locationdata,
    		timezone,
    		link,
    		search,
    		search_code,
    		worlddata,
    		flag,
    		accu_key,
    		gotSearch
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
