const Client = require('../../../modals/clients')
const Config = require('../../..//modals/config');

module.exports.checkUser = async function(req,res){
    let {Body, From} = JSON.parse(decodeURIComponent(req.query.data));
    let splitMessage = Body.split('to ');
    let clientName = splitMessage[1].toLowerCase();

    console.log(From);

    try{
        let client = await Client.findOne({name: clientName}).populate('users').populate('config');
        try{
            let user = client.users.find((user) => user.phone == userNum);
            if(!user){
                clientName = clientName.toUpperCase()
                sendMessage(`Sorry\nYou are not registered on ${clientName}.\nPlease Register first`,From);
            }else{
                const token = jwt.sign(user.toJSON(), secretKey, {expiresIn: '1d'} );

                user.lastLogin = new Date();
                await user.save();

                let url = `${client.config.customDomain}${client.config.redirectPage}/${token}`;
                sendMessage(`Please continue on this link.\n${url}`,From);
                res.json(200,{
                    success: true,
                    message: "User Signed In",
                    token: token
                });
            }
        }catch(err){
            console.log(err);
        }

    }catch(err){
        console.log(err);
    }
}





module.exports.setConfig = async function(req,res){

    let credential = req.query.credential;
    const {customDomain} = req.body;

    try{
        let client = await Client.findOnes({apiKey: credential}).populate('config');
        let config = client.config
        if(client){
            if(config){
                config.customDomain = customDomain
            }else{
                config = new Pigi({apiKey: credential, customDomain: customDomain});
            }
            await config.save();
            client.config = config;
            await client.upload();
            
        }

    }catch(err){
        console.error('Error updating configuration:', err);
        let isUser = await client.users.find((user) => user.phone == req.body.phone);
        return res.status(500).json({ error: 'An error occurred while updating the settings' });
    }
    let newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        clientID: client._id
    });
}

module.exports.registerUser = async function(req, res){
    let client_cred = req.params.credential;
    
    try{
        try{
            let isUser = await client.users.find((user) => user.phone == req.body.phone);
            // let user = client.users.find((user) => user.phone == userNum);
            if(!isUser){
                let newUser = await User.create({
                    name: req.body.name,
                    email: req.body.email,
                    phone: req.body.phone,
                    clientID: client._id
                });
                client.users.push(newUser._id);
                await client.save();
                return res.json(200,{
                    success: false,
                    message: "User not found",
                    user: newUser
                })
            }
        }catch(err){
            console.log(err);
            return res.json(409,{
                success: false,
                message: "User Already Registered",
            })
        }
    }catch(err){
        console.log(err);
        return res.json(404,{
            message: "Error in finding Client",
            error: err
        })
    }
}

var accountSid = process.env.TWILIO_ACCOUNT_SID
var authToken = process.env.TWILIO_AUTH_TOKEN

const twilio = require('twilio')(accountSid,authToken, {
    lazyLoading: true
});

const sendMessage = async function(message, senderID){
    try{
        await twilio.messages.create({
        })
    }catch(err){
        console.log("Error in sending message on whatsapp", err);
    }
}

module.exports = {
    sendMessage
}

let transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'swiftauth018',
        pass: 'lswkbifswngajgnp'
    }
});


let renderTemplate = (data, relativePath) => {
    let mailHTML;
    ejs.renderFile(
        path.join(__dirname, '../views/mailers', relativePath),
        data,
        function(err, template){
         if (err){console.log('error in rendering template'); return}
         
         mailHTML = template;
        }
    )

    return mailHTML;
}


module.exports = {
    transporter: transporter,
    renderTemplate: renderTemplate
}

const Client = require('../modals/clients')
const jwt = require('jsonwebtoken');
const emailVerifyMailer = require('../mailers/email_verify_mailer');
const querystring = require('querystring');
const uuid = require("uuid");
const secretKey = process.env.JWT_SECRET;


module.exports.emailVerfy = async function(req,res){
  try{
      const decoded = jwt.verify(req.params.token, secretKey);
      // const filter = {id: client.id};
      // console.log(filter);
      const id = decoded._id
      let result = await Client.findByIdAndUpdate(
        id.toString(),
        {verified: true},
        {new: true}
    )
      console.log("Email Verified!", result);
      return res.redirect('/client/dashboard/setup/'+req.params.token);
  }catch(err){
      if(err.name === "TokenExpiredError"){
          return res.redirect('/client/signup')
      }
      console.log(err);
  }
}

module.exports.create = async function(req, res){
    try{
        let isClient = await Client.findOne({email: req.body.email});
        console.log(req.body);
        if(!isClient){
            let newClient = await Client.create({
                apiKey: uuid.v4(),
                name: req.body.name.toLowerCase(),
                email: req.body.email,
                contact: req.body.contact,
                country: req.body.country
            })
            console.log("Client Added in DB");
            // client = await Client.findOne({email: req.body.email});
            console.log(newClient);
            const toke = jwt.sign(newClient.toJSON(), secretKey, {expiresIn: '1d'} );
            const data = {
              email: req.body.email,
              emailStatus: null // Placeholder value
          };
          const emailVerifyPromise = new Promise((resolve) => {
            emailVerifyMailer.emailVerify(newClient, token, (success) => {
                console.log(success);
                data.emailStatus = success;
                resolve();
            });
        });
        await emailVerifyPromise;
        console.log(data);
        const queryParams = querystring.stringify(data);
        return res.redirect(`/client/email-sent?${queryParams}`);
        }else{
          console.log("Client already exists in DB!");
          return res.redirect('/client/signin');
        }

    }
    catch(err){
        console.log(err);
        return;
    }
}
module.exports.signin = function(req, res){


  return res.render('client_signup')
  
}


module.exports.signin = function(req, res){


  return res.render('client_signup')
  
}
module.exports.signin = function(req, res){


  return res.render('client_signup')
  
}
module.exports.signin = function(req, res){
  let client =  Client.findOne({: client_cred}).populate('users');

  return res.render('client_signup')
  
}
module.exports.signin = function(req, res){


  return res.render('client_signup')
  
}
module.exports.signin = function(req, res){


  return res.render('client_signup')
  
}

module.emailSent = function(req, res){
  const email = req.query.email;
  const emailStatus = req.query.emailStatus;
  return res.render('email_confirmation',{
    email: email,
    emailStatus: emailStatus
  })
}

module.exports.signin = function(req, res){

  return res.render('client_login')
  print
}





module.exports.dashboardSetup = async function(req, res) {
  try {
    jwt.verify(req.params.token, secretKey, async function(err, decoded) {
      if (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return res.status(401).json({
            message: 'Token Expired!'
          });
        } else {
          return res.status(401).json({
            message: 'Token Invalid!'
          });
        }
      } else {
        console.log(decoded);
        // Fetch the client from the database using the decoded data
        try {
          let client = await Client.findOne({ email: decoded.email });
          if (!client) {
            // Handle client not found error
            return res.status(404).json({
              message: 'Client not found!'
            });
          }
          // Update the decoded object with the latest verified status
          decoded.verified = client.verified;
          
          return res.render('dashboard_cred', { data: decoded, token: req.params.token, clientName: decoded.name.toUpperCase() });
        } catch (err) {
          console.log(err);
          return res.status(500).json({
            message: 'Internal Server Error'
          });
        }
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: 'Internal Server Error'
    });
  }
};

module.exports.dashboardHistory = async function(req,res){
  try{
    const token = req.query.token;
    const credential = req.query.credential;
    console.log(client.users);
    return res.render('dashboard_history',{
      token: token,
      credential: credential,
      userData: client.users,
      clientName: client.name.toUpperCase()
    });
  }catch(err){
    console.log(err);
  }
}
/**
 * Module dependencies.
 */

const tty = require('tty');
const util = require('util');

/**
 * This is the Node.js implementation of `debug()`.
 */

exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.destroy = util.deprecate(
	() => {},
	'Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.'
);

/**
 * Colors.
 */

exports.colors = [6, 2, 3, 4, 5, 1];

try {
	// Optional dependency (as in, doesn't need to be installed, NOT like optionalDependencies in package.json)
	// eslint-disable-next-line import/no-extraneous-dependencies
	const supportsColor = require('supports-color');

	if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
		exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	}
} catch (error) {
	// Swallow - we only care if `supports-color` is available; it doesn't have to be.
}

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(key => {
	return /^debug_/i.test(key);
}).reduce((obj, key) => {
	// Camel-case
	const prop = key
		.substring(6)
		.toLowerCase()
		.replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});

	// Coerce string value into JS value
	let val = process.env[key];
	if (/^(yes|on|true|enabled)$/i.test(val)) {
		val = true;
	} else if (/^(no|off|false|disabled)$/i.test(val)) {
		val = false;
	} else if (val === 'null') {
		val = null;
	} else {
		val = Number(val);
	}

	obj[prop] = val;
	return obj;
}, {});

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
	return 'colors' in exports.inspectOpts ?
		Boolean(exports.inspectOpts.colors) :
		tty.isatty(process.stderr.fd);
}

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	const {namespace: name, useColors} = this;

	if (useColors) {
		const c = this.color;
		const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
		const prefix = `  ${colorCode};1m${name} \u001B[0m`;

		args[0] = prefix + args[0].split('\n').join('\n' + prefix);
		args.push(colorCode + 'm+' + module.exports.humanize(this.diff) + '\u001B[0m');
	} else {
		args[0] = getDate() + name + ' ' + args[0];
	}
}

function getDate() {
	if (exports.inspectOpts.hideDate) {
		return '';
	}
	return new Date().toISOString() + ' ';
}

/**
 * Invokes `util.format()` with the specified arguments and writes to stderr.
 */

function log(...args) {
	return process.stderr.write(util.format(...args) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	if (namespaces) {
		process.env.DEBUG = namespaces;
	} else {
		// If you set a process.env field to null or undefined, it gets cast to the
		// string 'null' or 'undefined'. Just delete instead.
		delete process.env.DEBUG;
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
	return process.env.DEBUG;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init(debug) {
	debug.inspectOpts = {};

	const keys = Object.keys(exports.inspectOpts);
	for (let i = 0; i < keys.length; i++) {
		debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
}

module.exports = require('./common')(exports);

const {formatters} = module.exports;

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

formatters.o = function (v) {
	this.inspectOpts.colors = this.useColors;
	return util.inspect(v, this.inspectOpts)
		.split('\n')
		.map(str => str.trim())
		.join(' ');
};

/**
 * Map %O to `util.inspect()`, allowing multiple lines if needed.
 */

formatters.O = function (v) {
	this.inspectOpts.colors = this.useColors;
	return util.inspect(v, this.inspectOpts);
};


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = require('ms');
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;

/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict';

/**
 * Module exports.
 * @public
 */

exports.parse = parse;
exports.serialize = serialize;

/**
 * Module variables.
 * @private
 */

var __toString = Object.prototype.toString

/**
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 *
 * @param {string} str
 * @param {object} [options]
 * @return {object}
 * @public
 */

function parse(str, options) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  var obj = {}
  var opt = options || {};
  var dec = opt.decode || decode;

  var index = 0
  while (index < str.length) {
    var eqIdx = str.indexOf('=', index)

    // no more cookie pairs
    if (eqIdx === -1) {
      break
    }

    var endIdx = str.indexOf(';', index)

    if (endIdx === -1) {
      endIdx = str.length
    } else if (endIdx < eqIdx) {
      // backtrack on prior semicolon
      index = str.lastIndexOf(';', eqIdx - 1) + 1
      continue
    }

    var key = str.slice(index, eqIdx).trim()

    // only assign once
    if (undefined === obj[key]) {
      var val = str.slice(eqIdx + 1, endIdx).trim()

      // quoted values
      if (val.charCodeAt(0) === 0x22) {
        val = val.slice(1, -1)
      }

      obj[key] = tryDecode(val, dec);
    }

    index = endIdx + 1
  }

  return obj;
}

/**
 * Serialize data into a cookie header.
 *
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 *
 * @param {string} name
 * @param {string} val
 * @param {object} [options]
 * @return {string}
 * @public
 */

function serialize(name, val, options) {
  var opt = options || {};
  var enc = opt.encode || encode;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  var value = enc(val);

  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  var str = name + '=' + value;

  if (null != opt.maxAge) {
    var maxAge = opt.maxAge - 0;

    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError('option maxAge is invalid')
    }

    str += '; Max-Age=' + Math.floor(maxAge);
  }

  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }

    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }

    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    var expires = opt.expires

    if (!isDate(expires) || isNaN(expires.valueOf())) {
      throw new TypeError('option expires is invalid');
    }

    str += '; Expires=' + expires.toUTCString()
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.priority) {
    var priority = typeof opt.priority === 'string'
      ? opt.priority.toLowerCase()
      : opt.priority

    switch (priority) {
      case 'low':
        str += '; Priority=Low'
        break
      case 'medium':
        str += '; Priority=Medium'
        break
      case 'high':
        str += '; Priority=High'
        break
      default:
        throw new TypeError('option priority is invalid')
    }
  }

  if (opt.sameSite) {
    var sameSite = typeof opt.sameSite === 'string'
      ? opt.sameSite.toLowerCase() : opt.sameSite;

    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

/**
 * URL-decode string value. Optimized to skip native call when no %.
 *
 * @param {string} str
 * @returns {string}
 */

function decode (str) {
  return str.indexOf('%') !== -1
    ? decodeURIComponent(str)
    : str
}

/**
 * URL-encode value.
 *
 * @param {string} str
 * @returns {string}
 */

function encode (val) {
  return encodeURIComponent(val)
}

/**
 * Determine if value is a Date.
 *
 * @param {*} val
 * @private
 */

function isDate (val) {
  return __toString.call(val) === '[object Date]' ||
    val instanceof Date
}

/**
 * Try decoding a string using a decoding function.
 *
 * @param {string} str
 * @param {function} decode
 * @private
 */

function tryDecode(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
}
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const console_1 = require("console");
const util_1 = __importDefault(require("util"));
const session = __importStar(require("express-session"));
const mongodb_1 = require("mongodb");
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('connect-mongo');
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => { };
const unit = (a) => a;
function defaultSerializeFunction(session) {
    // Copy each property of the session to a new object
    const obj = {};
    let prop;
    for (prop in session) {
        if (prop === 'cookie') {
            // Convert the cookie instance to an object, if possible
            // This gets rid of the duplicate object under session.cookie.data property
            // @ts-ignore FIXME:
            obj.cookie = session.cookie.toJSON
                ? // @ts-ignore FIXME:
                    session.cookie.toJSON()
                : session.cookie;
        }
        else {
            // @ts-ignore FIXME:
            obj[prop] = session[prop];
        }
    }
    return obj;
}
function computeTransformFunctions(options) {
    if (options.serialize || options.unserialize) {
        return {
            serialize: options.serialize || defaultSerializeFunction,
            unserialize: options.unserialize || unit,
        };
    }
    if (options.stringify === false) {
        return {
            serialize: defaultSerializeFunction,
            unserialize: unit,
        };
    }
    // Default case
    return {
        serialize: JSON.stringify,
        unserialize: JSON.parse,
    };
    for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}
}
class MongoStore extends session.Store {
    constructor({ collectionName = 'sessions', ttl = 1209600, mongoOptions = {}, autoRemove = 'native', autoRemoveInterval = 10, touchAfter = 0, stringify = true, crypto, ...required }) {
        super();
        this.crypto = null;
        debug('create MongoStore instance');
        const options = {
            collectionName,
            ttl,
            mongoOptions,
            autoRemove,
            autoRemoveInterval,
            touchAfter,
            stringify,
            crypto: {
                ...{
                    secret: false,
                    algorithm: 'aes-256-gcm',
                    hashing: 'sha512',
                    encodeas: 'base64',
                    key_size: 32,
                    iv_size: 16,
                    at_size: 16,
                },
                ...crypto,
            },
            ...required,
        };
        // Check params
        console_1.assert(options.mongoUrl || options.clientPromise || options.client, 'You must provide either mongoUrl|clientPromise|client in options');
        console_1.assert(options.createAutoRemoveIdx === null ||
            options.createAutoRemoveIdx === undefined, 'options.createAutoRemoveIdx has been reverted to autoRemove and autoRemoveInterval');
        console_1.assert(!options.autoRemoveInterval || options.autoRemoveInterval <= 71582, 
        /* (Math.pow(2, 32) - 1) / (1000 * 60) */ 'autoRemoveInterval is too large. options.autoRemoveInterval is in minutes but not seconds nor mills');
        this.transformFunctions = computeTransformFunctions(options);
        let _clientP;
        if (options.mongoUrl) {
            _clientP = mongodb_1.MongoClient.connect(options.mongoUrl, options.mongoOptions);
        }
        else if (options.clientPromise) {
            _clientP = options.clientPromise;
        }
        else if (options.client) {
            _clientP = Promise.resolve(options.client);
        }
        else {
            throw new Error('Cannot init client. Please provide correct options');
        }
        console_1.assert(!!_clientP, 'Client is null|undefined');
        this.clientP = _clientP;
        this.options = options;
        this.collectionP = _clientP.then(async (con) => {
            const collection = con
                .db(options.dbName)
                .collection(options.collectionName);
            await this.setAutoRemove(collection);
            return collection;
        });
        if (options.crypto.secret) {
            this.crypto = require('kruptein')(options.crypto);
        }
    }
    static create(options) {
        return new MongoStore(options);
    }
    setAutoRemove(collection) {
        const removeQuery = () => ({
            expires: {
                $lt: new Date(),
            },
        });
        switch (this.options.autoRemove) {
            case 'native':
                debug('Creating MongoDB TTL index');
                return collection.createIndex({ expires: 1 }, {
                    background: true,
                    expireAfterSeconds: 0,
                });
            case 'interval':
                debug('create Timer to remove expired sessions');
                this.timer = setInterval(() => collection.deleteMany(removeQuery(), {
                    writeConcern: {
                        w: 0,
                        j: false,
                    },
                }), this.options.autoRemoveInterval * 1000 * 60);
                this.timer.unref();
                return Promise.resolve();
            case 'disabled':
            default:
                return Promise.resolve();
        }
    }
    computeStorageId(sessionId) {
        if (this.options.transformId &&
            typeof this.options.transformId === 'function') {
            return this.options.transformId(sessionId);
        }
        return sessionId;
    }
    /**
     * promisify and bind the `this.crypto.get` function.
     * Please check !!this.crypto === true before using this getter!
     */
    get cryptoGet() {
        if (!this.crypto) {
            throw new Error('Check this.crypto before calling this.cryptoGet!');
        }
        return util_1.default.promisify(this.crypto.get).bind(this.crypto);
    }
    /**
     * Decrypt given session data
     * @param session session data to be decrypt. Mutate the input session.
     */
    async decryptSession(session) {
        if (this.crypto && session) {
            const plaintext = await this.cryptoGet(this.options.crypto.secret, session.session).catch((err) => {
                throw new Error(err);
            });
            // @ts-ignore
            session.session = JSON.parse(plaintext);
        }
    }
    /**
     * Get a session from the store given a session ID (sid)
     * @param sid session ID
     */
    get(sid, callback) {
        ;
        (async () => {
            try {
                debug(`MongoStore#get=${sid}`);
                const collection = await this.collectionP;
                const session = await collection.findOne({
                    _id: this.computeStorageId(sid),
                    $or: [
                        { expires: { $exists: false } },
                        { expires: { $gt: new Date() } },
                    ],
                });
                if (this.crypto && session) {
                    await this.decryptSession(session).catch((err) => callback(err));
                }
                const s = session && this.transformFunctions.unserialize(session.session);
                if (this.options.touchAfter > 0 && (session === null || session === void 0 ? void 0 : session.lastModified)) {
                    s.lastModified = session.lastModified;
                }
                this.emit('get', sid);
                callback(null, s === undefined ? null : s);
            }
            catch (error) {
                callback(error);
            }
        })();
    }
    /**
     * Upsert a session into the store given a session ID (sid) and session (session) object.
     * @param sid session ID
     * @param session session object
     */
    set(sid, session, callback = noop) {
        ;
        (async () => {
            var _a;
            try {
                debug(`MongoStore#set=${sid}`);
                // Removing the lastModified prop from the session object before update
                // @ts-ignore
                if (this.options.touchAfter > 0 && (session === null || session === void 0 ? void 0 : session.lastModified)) {
                    // @ts-ignore
                    delete session.lastModified;
                }
                const s = {
                    _id: this.computeStorageId(sid),
                    session: this.transformFunctions.serialize(session),
                };
                // Expire handling
                if ((_a = session === null || session === void 0 ? void 0 : session.cookie) === null || _a === void 0 ? void 0 : _a.expires) {
                    s.expires = new Date(session.cookie.expires);
                }
                else {
                    // If there's no expiration date specified, it is
                    // browser-session cookie or there is no cookie at all,
                    // as per the connect docs.
                    //
                    // So we set the expiration to two-weeks from now
                    // - as is common practice in the industry (e.g Django) -
                    // or the default specified in the options.
                    s.expires = new Date(Date.now() + this.options.ttl * 1000);
                }
                // Last modify handling
                if (this.options.touchAfter > 0) {
                    s.lastModified = new Date();
                }
                if (this.crypto) {
                    const cryptoSet = util_1.default.promisify(this.crypto.set).bind(this.crypto);
                    const data = await cryptoSet(this.options.crypto.secret, s.session).catch((err) => {
                        throw new Error(err);
                    });
                    s.session = data;
                }
                const collection = await this.collectionP;
                const rawResp = await collection.updateOne({ _id: s._id }, { $set: s }, {
                    upsert: true,
                    writeConcern: this.options.writeOperationOptions,
                });
                if (rawResp.upsertedCount > 0) {
                    this.emit('create', sid);
                }
                else {
                    this.emit('update', sid);
                }
                this.emit('set', sid);
            }
            catch (error) {
                return callback(error);
            }
            return callback(null);
        })();
    }
    touch(sid, session, callback = noop) {
        ;
        (async () => {
            var _a;
            try {
                debug(`MongoStore#touch=${sid}`);
                const updateFields = {};
                const touchAfter = this.options.touchAfter * 1000;
                const lastModified = session.lastModified
                    ? session.lastModified.getTime()
                    : 0;
                const currentDate = new Date();
                // If the given options has a touchAfter property, check if the
                // current timestamp - lastModified timestamp is bigger than
                // the specified, if it's not, don't touch the session
                if (touchAfter > 0 && lastModified > 0) {
                    const timeElapsed = currentDate.getTime() - lastModified;
                    if (timeElapsed < touchAfter) {
                        debug(`Skip touching session=${sid}`);
                        return callback(null);
                    }
                    updateFields.lastModified = currentDate;
                }
                if ((_a = session === null || session === void 0 ? void 0 : session.cookie) === null || _a === void 0 ? void 0 : _a.expires) {
                    updateFields.expires = new Date(session.cookie.expires);
                }
                else {
                    updateFields.expires = new Date(Date.now() + this.options.ttl * 1000);
                }
                const collection = await this.collectionP;
                const rawResp = await collection.updateOne({ _id: this.computeStorageId(sid) }, { $set: updateFields }, { writeConcern: this.options.writeOperationOptions });
                if (rawResp.matchedCount === 0) {
                    return callback(new Error('Unable to find the session to touch'));
                }
                else {
                    this.emit('touch', sid, session);
                    return callback(null);
                }
            }
            catch (error) {
                return callback(error);
            }
        })();
    }
    /**
     * Get all sessions in the store as an array
     */
    all(callback) {
        ;
        (async () => {
            try {
                debug('MongoStore#all()');
                const collection = await this.collectionP;
                const sessions = collection.find({
                    $or: [
                        { expires: { $exists: false } },
                        { expires: { $gt: new Date() } },
                    ],
                });
                const results = [];
                for await (const session of sessions) {
                    if (this.crypto && session) {
                        await this.decryptSession(session);
                    }
                    results.push(this.transformFunctions.unserialize(session.session));
                }
                this.emit('all', results);
                callback(null, results);
            }
            catch (error) {
                callback(error);
            }
        })();
    }
    /**
     * Destroy/delete a session from the store given a session ID (sid)
     * @param sid session ID
     */
    destroy(sid, callback = noop) {
        debug(`MongoStore#destroy=${sid}`);
        this.collectionP
            .then((colleciton) => colleciton.deleteOne({ _id: this.computeStorageId(sid) }, { writeConcern: this.options.writeOperationOptions }))
            .then(() => {
            this.emit('destroy', sid);
            callback(null);
        })
            .catch((err) => callback(err));
    }
    /**
     * Get the count of all sessions in the store
     */
    length(callback) {
        debug('MongoStore#length()');
        this.collectionP
            .then((collection) => collection.countDocuments())
            .then((c) => callback(null, c))
            // @ts-ignore
            .catch((err) => callback(err));
    }
    /**
     * Delete all sessions from the store.
     */
    clear(callback = noop) {
        debug('MongoStore#clear()');
        this.collectionP
            .then((collection) => collection.drop())
            .then(() => callback(null))
            .catch((err) => callback(err));
    }
    /**
     * Close database connection
     */
    close() {
        debug('MongoStore#close()');
        return this.clientP.then((c) => c.close());
    }
}
exports.default = MongoStore;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9uZ29TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvTW9uZ29TdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxxQ0FBZ0M7QUFDaEMsZ0RBQXVCO0FBQ3ZCLHlEQUEwQztBQUMxQyxxQ0FLZ0I7QUFDaEIsa0RBQXlCO0FBR3pCLE1BQU0sS0FBSyxHQUFHLGVBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQWdFcEMsZ0VBQWdFO0FBQ2hFLE1BQU0sSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQTtBQUNyQixNQUFNLElBQUksR0FBbUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUVyQyxTQUFTLHdCQUF3QixDQUMvQixPQUE0QjtJQUU1QixvREFBb0Q7SUFDcEQsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFBO0lBQ2QsSUFBSSxJQUFJLENBQUE7SUFDUixLQUFLLElBQUksSUFBSSxPQUFPLEVBQUU7UUFDcEIsSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO1lBQ3JCLHdEQUF3RDtZQUN4RCwyRUFBMkU7WUFDM0Usb0JBQW9CO1lBQ3BCLEdBQUcsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNO2dCQUNoQyxDQUFDLENBQUMsb0JBQW9CO29CQUNwQixPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtnQkFDekIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUE7U0FDbkI7YUFBTTtZQUNMLG9CQUFvQjtZQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1NBQzFCO0tBQ0Y7SUFFRCxPQUFPLEdBQTBCLENBQUE7QUFDbkMsQ0FBQztBQUVELFNBQVMseUJBQXlCLENBQUMsT0FBbUM7SUFDcEUsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLE9BQU8s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

