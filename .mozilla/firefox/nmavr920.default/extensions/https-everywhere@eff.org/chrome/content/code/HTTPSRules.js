function Rule(from, to) {
  //this.from = from;
  this.to = to;
  this.from_c = new RegExp(from);
}

function Exclusion(pattern) {
  //this.pattern = pattern;
  this.pattern_c = new RegExp(pattern);
}

function CookieRule(host, cookiename) {
  this.host = host;
  this.host_c = new RegExp(host);
  this.name = cookiename;
  this.name_c = new RegExp(cookiename);
}

// Firefox 23+ blocks mixed content by default, so rulesets that create
// mixed content situations should be disabled there

try {
  var appPrefs = CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefBranch);
  var blockMixedContent = appPrefs.getBoolPref("security.mixed_content.block_active_content");
  if(blockMixedContent) {
    localPlatformRegexp = new RegExp("firefox");
  } else {
    localPlatformRegexp = new RegExp("(firefox|mixedcontent)");
  }
} catch(e) {
  localPlatformRegexp = new RegExp("(firefox|mixedcontent)");
}

ruleset_counter = 0;
function RuleSet(name, xmlName, match_rule, default_off, platform) {
  if(xmlName == "WordPress.xml" || xmlName == "Github.xml") {
    this.log(NOTE, "RuleSet( name="+name+", xmlName="+xmlName+", match_rule="+match_rule+", default_off="+default_off+", platform="+platform+" )");
  }

  this.id="httpseR" + ruleset_counter;
  ruleset_counter += 1;
  this.on_by_default = true;
  this.name = name;
  this.xmlName = xmlName;
  //this.ruleset_match = match_rule;
  this.notes = "";
  if (match_rule)   this.ruleset_match_c = new RegExp(match_rule);
  else              this.ruleset_match_c = null;
  if (default_off) {
    // Perhaps problematically, this currently ignores the actual content of
    // the default_off XML attribute.  Ideally we'd like this attribute to be
    // "valueless"
    this.notes = default_off;
    this.on_by_default = false;
  }
  if (platform)
    if (platform.search(localPlatformRegexp) == -1) {
      this.on_by_default = false;
      this.notes = "Only for " + platform;
    }

  this.rules = [];
  this.exclusions = [];
  this.cookierules = [];
  
  this.rule_toggle_prefs = HTTPSEverywhere.instance.rule_toggle_prefs;

  try {
    // if this pref exists, use it
    this.active = this.rule_toggle_prefs.getBoolPref(name);
  } catch(e) {
    // if not, use the default
    this.active = this.on_by_default;
  }
}

var dom_parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);

RuleSet.prototype = {
  apply: function(urispec) {
    // return null if it does not apply
    // and the new url if it does apply
    var i;
    var returl = null;
    // If a rulset has a match_rule and it fails, go no further
    if (this.ruleset_match_c && !this.ruleset_match_c.test(urispec)) {
      this.log(VERB, "ruleset_match_c excluded " + urispec);
      return null;
    }
    // Even so, if we're covered by an exclusion, go home
    for (i = 0; i < this.exclusions.length; ++i) {
      if (this.exclusions[i].pattern_c.test(urispec)) {
        this.log(DBUG,"excluded uri " + urispec);
        return null;
      }
    }
    // Okay, now find the first rule that triggers
    for (i = 0; i < this.rules.length; ++i) {
      // This is just for displaying inactive rules
      returl = urispec.replace(this.rules[i].from_c, this.rules[i].to);
      if (returl != urispec) return returl;
    }

    return null;
  },
  log: function(level, msg) {
    https_everywhereLog(level, msg);
  },
 
  wouldMatch: function(hypothetical_uri, alist) {
    // return true if this ruleset would match the uri, assuming it were http
    // used for judging moot / inactive rulesets
    // alist is optional
 
    // if the ruleset is already somewhere in this applicable list, we don't
    // care about hypothetical wouldMatch questions
    if (alist && (this.name in alist.all)) return false;
 
    this.log(DBUG,"Would " +this.name + " match " +hypothetical_uri.spec +
             "?  serial " + (alist && alist.serial));
     
    var uri = hypothetical_uri.clone();
    if (uri.scheme == "https") uri.scheme = "http";
    var urispec = uri.spec;
 
    if (this.ruleset_match_c && !this.ruleset_match_c.test(urispec)) 
      return false;
 
    for (i = 0; i < this.exclusions.length; ++i) 
      if (this.exclusions[i].pattern_c.test(urispec)) return false;
 
    for (i = 0; i < this.rules.length; ++i) 
      if (this.rules[i].from_c.test(urispec)) return true;
    return false;
  },

  transformURI: function(uri) {
    // If no rule applies, return null; if a rule would have applied but was
    // inactive, return 0; otherwise, return a fresh uri instance
    // for the target
    var newurl = this.apply(uri.spec);
    if (null == newurl) 
      return null;
    var newuri = Components.classes["@mozilla.org/network/standard-url;1"].
                 createInstance(CI.nsIStandardURL);
    newuri.init(CI.nsIStandardURL.URLTYPE_STANDARD, 80,
             newurl, uri.originCharset, null);
    newuri = newuri.QueryInterface(CI.nsIURI);
    return newuri;
  },

  enable: function() {
    // Enable us.
    this.rule_toggle_prefs.setBoolPref(this.name, true);
    this.active = true;
  },

  disable: function() {
    // Disable us.
    this.rule_toggle_prefs.setBoolPref(this.name, false);
    this.active = false;
  },

  toggle: function() {
    this.active = !this.active;
    this.rule_toggle_prefs.setBoolPref(this.name, this.active);
  },

  clear: function() {
    try {
      this.rule_toggle_prefs.clearUserPref(this.name);
    } catch(e) {
      // this ruleset has never been toggled
    }
    this.active = this.on_by_default;
  }
};

const RuleWriter = {

  getCustomRuleDir: function() {
    var loc = "ProfD";  // profile directory
    var file =
      CC["@mozilla.org/file/directory_service;1"]
      .getService(CI.nsIProperties)
      .get(loc, CI.nsILocalFile)
      .clone();
    file.append("HTTPSEverywhereUserRules");
    // Check for existence, if not, create.
    if (!file.exists()) {
      file.create(CI.nsIFile.DIRECTORY_TYPE, 0700);
    }
    if (!file.isDirectory()) {
      // XXX: Arg, death!
    }
    return file;
  },

  chromeToPath: function (aPath) {
    if (!aPath || !(/^chrome:/.test(aPath)))
       return; //not a chrome url

    var ios =
      CC['@mozilla.org/network/io-service;1']
      .getService(CI.nsIIOService);
    var uri = ios.newURI(aPath, "UTF-8", null);
    var cr =
      CC['@mozilla.org/chrome/chrome-registry;1']
      .getService(CI.nsIChromeRegistry);
    var rv = cr.convertChromeURL(uri).spec;

    if (/^file:/.test(rv))
      rv = this.urlToPath(rv);
    else
      rv = this.urlToPath("file://"+rv);

    return rv;
  },

  urlToPath: function (aPath) {
    if (!aPath || !/^file:/.test(aPath))
      return ;

    var ph =
      CC["@mozilla.org/network/protocol;1?name=file"]
      .createInstance(CI.nsIFileProtocolHandler);
    var rv = ph.getFileFromURLSpec(aPath).path;

    return rv;
  },

  getRuleDir: function() {
    loc = "chrome://https-everywhere/content/rules/";

    var file =
      CC["@mozilla.org/file/local;1"]
      .createInstance(CI.nsILocalFile);  
    file.initWithPath(this.chromeToPath(loc));

    if (!file.isDirectory()) {
      // XXX: Arg, death!
      this.log(WARN,"Catastrophic failure: extension directory is not a directory");
    }
    return file;
  },

  read: function(file, rule_store) {
    if (!file.exists())
      return null;
    if ((rule_store.targets == null) && (rule_store.targets != {}))
      this.log(WARN, "TARGETS IS NULL");
    var data = "";
    var fstream = CC["@mozilla.org/network/file-input-stream;1"]
        .createInstance(CI.nsIFileInputStream);
    var sstream = CC["@mozilla.org/scriptableinputstream;1"]
        .createInstance(CI.nsIScriptableInputStream);
    fstream.init(file, -1, 0, 0);
    sstream.init(fstream);

    var str = sstream.read(4096);
    while (str.length > 0) {
      data += str;
      str = sstream.read(4096);
    }

    sstream.close();
    fstream.close();
    // XXX: With DOMParser, we probably do not need to throw away the XML
    // declaration anymore nowadays.
    data = data.replace(/<\?xml[^>]*\?>/, ""); 
    try {
      var xmlrulesets = dom_parser.parseFromString(data, "text/xml");
    } catch(e) { // file has been corrupted; XXX: handle error differently
      this.log(WARN,"Error in XML file: " + file.path + "\n" + e);
      return null;
    }
    this.parseXmlRulesets(xmlrulesets, rule_store, file);
  },

  parseXmlRulesets: function(xmldom, rule_store, file) {
    // XML input files can either be a <ruleset> in a file, or a
    // <rulesetlibrary> with many <rulesets> inside it (the latter form exists
    // because ZIP does a much better job of compressing it).
    if (xmldom.documentElement.nodeName == "ruleset") {
      // This is a single ruleset.
      this.parseOneRuleset(xmldom.documentElement, rule_store, file);
    } else {
      // The root of the XML tree is assumed to look like a <rulesetlibrary>
      if (!xmldom.documentElement.getAttribute("gitcommitid")) {
        // The gitcommitid is a tricky hack to let us display the true full
        // source code of a ruleset, even though we strip out comments at build
        // time, by having the UI fetch the ruleset from the public https git repo.
        this.log(DBUG, "gitcommitid tag not found in <xmlruleset>");
        rule_store.GITCommitID = "HEAD";
      } else {
        rule_store.GITCommitID = xmldom.documentElement.getAttribute("gitcommitid");
      }

      var rulesets = xmldom.documentElement.getElementsByTagName("ruleset");
      if (rulesets.length == 0 && (file.path.search("00README") == -1))
        this.log(WARN, "Probable <rulesetlibrary> with no <rulesets> in "
                        + file.path + "\n" +  xmldom);
      for (var j = 0; j < rulesets.length; j++)
        this.parseOneRuleset(rulesets[j], rule_store, file);
    }
  },

  parseOneRuleset: function(xmlruleset, rule_store, file) {
    // Extract an xmlruleset into the rulestore
    if (!xmlruleset.getAttribute("name")) {
      this.log(WARN, "This blob: '" + xmlruleset + "' is not a ruleset\n");
      return null;
    }

    this.log(DBUG, "Parsing " + xmlruleset.getAttribute("name") + " from " + file.path);

    var match_rl = xmlruleset.getAttribute("match_rule");
    var dflt_off = xmlruleset.getAttribute("default_off");
    var platform = xmlruleset.getAttribute("platform");
    var rs = new RuleSet(xmlruleset.getAttribute("name"), xmlruleset.getAttribute("f"), match_rl, dflt_off, platform);

    var targets = xmlruleset.getElementsByTagName("target");
    if (targets.length == 0) {
      var msg = "Error: As of v0.3.0, XML rulesets require a target domain entry,";
      msg = msg + "\nbut " + file.path + " is missing one.";
      this.log(WARN, msg);
      return null;
    }

    // see if this ruleset has the same name as an existing ruleset;
    // if so, this ruleset is ignored; DON'T add or return it.
    if (rs.name in rule_store.rulesetsByName) {
      this.log(WARN, "Error: found duplicate rule name " + rs.name + " in file " + file.path);
      return null;
    }

    // add this ruleset into HTTPSRules.targets with all of the applicable
    // target host indexes
    for (var i = 0; i < targets.length; i++) {
      var host = targets[i].getAttribute("host");
      if (!host) {
        this.log(WARN, "<target> missing host in " + file.path);
        return null;
      }
      if (! rule_store.targets[host])
        rule_store.targets[host] = [];
      rule_store.targets[host].push(rs);
    }

    var exclusions = xmlruleset.getElementsByTagName("exclusion");
    for (var i = 0; i < exclusions.length; i++) {
      var exclusion = new Exclusion(exclusions[i].getAttribute("pattern"));
      rs.exclusions.push(exclusion);
    }

    var rules = xmlruleset.getElementsByTagName("rule");
    for (var i = 0; i < rules.length; i++) {
      var rule = new Rule(rules[i].getAttribute("from"),
                          rules[i].getAttribute("to"));
      rs.rules.push(rule);
    }

    var securecookies = xmlruleset.getElementsByTagName("securecookie");
    for (var i = 0; i < securecookies.length; i++) {
      var c_rule = new CookieRule(securecookies[i].getAttribute("host"),
                                  securecookies[i].getAttribute("name"));
      rs.cookierules.push(c_rule);
      this.log(DBUG,"Cookie rule "+ c_rule.host+ " " +c_rule.name);
    }

    rule_store.rulesets.push(rs);
    rule_store.rulesetsByID[rs.id] = rs;
    rule_store.rulesetsByName[rs.name] = rs;

  },

  enumerate: function(dir) {
    // file is the given directory (nsIFile)
    var entries = dir.directoryEntries;
    var ret = [];
    while(entries.hasMoreElements()) {
      var entry = entries.getNext();
      entry.QueryInterface(Components.interfaces.nsIFile);
      ret.push(entry);
    }
    return ret;
  },
};



const HTTPSRules = {
  init: function() {
    try {
      this.rulesets = [];
      this.targets = {};  // dict mapping target host patterns -> lists of
                          // applicable rules
      this.rulesetsByID = {};
      this.rulesetsByName = {};
      var t1 = new Date().getTime();
      var rulefiles = RuleWriter.enumerate(RuleWriter.getCustomRuleDir());
      this.scanRulefiles(rulefiles);
      rulefiles = RuleWriter.enumerate(RuleWriter.getRuleDir());
      this.scanRulefiles(rulefiles);
      var t,i;
      for (t in this.targets) {
        for (i = 0 ; i < this.targets[t].length ; i++) {
          this.log(INFO, t + " -> " + this.targets[t][i].name);
        }
      }

      // for any rulesets with <target host="*">
      // every URI needs to be checked against these rulesets
      // (though currently we don't ship any)
      this.global_rulesets = this.targets["*"] ? this.targets["*"] : [];

      this.rulesets.sort(
        function(r1,r2) {
            if (r1.name.toLowerCase() < r2.name.toLowerCase()) return -1;
            else return 1;
        }
      );
    } catch(e) {
      this.log(WARN,"Rules Failed: "+e);
    }
    var t2 =  new Date().getTime();
    this.log(NOTE,"Loading rulesets took " + (t2 - t1) / 1000.0 + " seconds");
    return;
  },

  scanRulefiles: function(rulefiles) {
    var i = 0;
    var r = null;
    for(i = 0; i < rulefiles.length; ++i) {
      try {
        this.log(DBUG,"Loading ruleset file: "+rulefiles[i].path);
        RuleWriter.read(rulefiles[i], this);
      } catch(e) {
        this.log(WARN, "Error in ruleset file: " + e);
        if (e.lineNumber)
          this.log(WARN, "(line number: " + e.lineNumber + ")");
      }
    }
  },

  resetRulesetsToDefaults: function() {
    // Callable from within the prefs UI and also for cleaning up buggy
    // configurations...
    for (var i in this.rulesets) {
      this.rulesets[i].clear();
    }
  },

  rewrittenURI: function(alist, input_uri) {
    // This function oversees the task of working out if a uri should be
    // rewritten, what it should be rewritten to, and recordkeeping of which
    // applicable rulesets are and aren't active.  Previously this returned
    // the new uri if there was a rewrite.  Now it returns a JS object with a
    // newuri attribute and an applied_ruleset attribute (or null if there's
    // no rewrite).
    var i = 0; 
    userpass_present = false; // Global so that sanitiseURI can tweak it.
                              // Why does JS have no tuples, again?
    var blob = {}; blob.newuri = null;
    if (!alist) this.log(DBUG, "No applicable list rewriting " + input_uri.spec);
    this.log(NOTE, "Processing " + input_uri.spec);

    var uri = this.sanitiseURI(input_uri);

    // Get the list of rulesets that target this host
    try {
      var rs = this.potentiallyApplicableRulesets(uri.host);
    } catch(e) {
      this.log(WARN, 'Could not check applicable rules for '+uri.spec);
      return null;
    }

    // ponder each potentially applicable ruleset, working out if it applies
    // and recording it as active/inactive/moot/breaking in the applicable list
    for (i = 0; i < rs.length; ++i) {
      if (!rs[i].active) {
        if (alist && rs[i].wouldMatch(uri, alist))
          alist.inactive_rule(rs[i]);
        continue;
      } 
      blob.newuri = rs[i].transformURI(uri);
      if (blob.newuri) {
        // we rewrote the uri
	this.log(DBUG, "Rewrote "+input_uri.spec);
        if (alist) {
          if (uri.spec in https_everywhere_blacklist) 
            alist.breaking_rule(rs[i]);
          else 
            alist.active_rule(rs[i]);
	}
        if (userpass_present) blob.newuri.userPass = input_uri.userPass;
        blob.applied_ruleset = rs[i];
        return blob;
      }
      if (uri.scheme == "https" && alist) {
        // we didn't rewrite but the rule applies to this domain and the
        // requests are going over https
        if (rs[i].wouldMatch(uri, alist)) alist.moot_rule(rs[i]);
        continue;
      } 
    }
    return null;
  },

  sanitiseURI: function(input_uri) {
    // Rulesets shouldn't try to parse usernames and passwords.  If we find
    // those, apply the ruleset without them (and then add them back later).
    // When .userPass is absent, sometimes it is false and sometimes trying
    // to read it raises an exception (probably depending on the URI type).
    var uri = input_uri;
    try {
      if (input_uri.userPass) {
        uri = input_uri.clone();
        userpass_present = true; // tweaking a global in our caller :(
        uri.userPass = null;
      } 
    } catch(e) {}

    // example.com.  is equivalent to example.com
    // example.com.. is invalid, but firefox would load it anyway
    try {
      if (uri.host)
        try {
          var h = uri.host;
          if (h.charAt(h.length - 1) == ".") {
            while (h.charAt(h.length - 1) == ".") 
              h = h.slice(0,-1);
            uri = uri.clone();
            uri.host = h;
          }
        } catch(e) {
          this.log(WARN, "Failed to normalise domain: ");
          try       {this.log(WARN, input_uri.host);}
          catch(e2) {this.log(WARN, "bang" + e + " & " + e2 + " & "+ input_uri);}
        }
    } catch(e3) {
      this.log(WARN, "uri.host is explosive!");
      try       { this.log(WARN, "(" + uri.spec + ")"); } 
      catch(e4) { this.log(WARN, "(and unprintable)"); }
    }
    return uri;
  },

  setInsert: function(intoList, fromList) {
    // Insert any elements from fromList into intoList, if they are not
    // already there.  fromList may be null.
    if (!fromList) return;
    for (var i = 0; i < fromList.length; i++)
      if (intoList.indexOf(fromList[i]) == -1)
        intoList.push(fromList[i]);
  },

  potentiallyApplicableRulesets: function(host) {
    // Return a list of rulesets that declare targets matching this host
    var i, tmp, t;
    var results = this.global_rulesets.slice(0); // copy global_rulesets
    try {
      if (this.targets[host])
        results = results.concat(this.targets[host]);
    } catch(e) {   
      this.log(DBUG,"Couldn't check for ApplicableRulesets: " + e);
      return [];
    }
    // replace each portion of the domain with a * in turn
    var segmented = host.split(".");
    for (i = 0; i < segmented.length; ++i) {
      tmp = segmented[i];
      segmented[i] = "*";
      t = segmented.join(".");
      segmented[i] = tmp;
      this.setInsert(results, this.targets[t]);
    }
    // now eat away from the left, with *, so that for x.y.z.google.com we
    // check *.z.google.com and *.google.com (we did *.y.z.google.com above)
    for (i = 1; i <= segmented.length - 2; ++i) {
      t = "*." + segmented.slice(i,segmented.length).join(".");
      this.setInsert(results, this.targets[t]);
    }
    this.log(DBUG,"Potentially applicable rules for " + host + ":");
    for (i = 0; i < results.length; ++i)
      this.log(DBUG, "  " + results[i].name);
    return results;
  },

  shouldSecureCookie: function(applicable_list, c, known_https) {
    // Check to see if the Cookie object c meets any of our cookierule citeria
    // for being marked as secure.
    // @applicable_list : an ApplicableList or record keeping
    // @c : an nsICookie2
    // @known_https : true if we know the page setting the cookie is https

    this.log(DBUG,"  rawhost: " + c.rawHost + "\n  name: " + c.name + "\n  host" + c.host);
    var i,j;
    var rs = this.potentiallyApplicableRulesets(c.host);
    for (i = 0; i < rs.length; ++i) {
      var ruleset = rs[i];
      if (ruleset.active) {
        // Never secure a cookie if this page might be HTTP
        if (!known_https && !this.safeToSecureCookie(c.rawHost))
          continue;
        for (j = 0; j < ruleset.cookierules.length; j++) {
          var cr = ruleset.cookierules[j];
          if (cr.host_c.test(c.host) && cr.name_c.test(c.name)) {
            if (applicable_list) applicable_list.active_rule(ruleset);
            this.log(INFO,"Active cookie rule " + ruleset.name);
            return true;
          }
        }
        if (ruleset.cookierules.length > 0)
          if (applicable_list) applicable_list.moot_rule(ruleset);
      } else if (ruleset.cookierules.length > 0) {
        if (applicable_list) applicable_list.inactive_rule(ruleset);
        this.log(INFO,"Inactive cookie rule " + ruleset.name);
      }
    }
    return false;
  },

  safeToSecureCookie: function(domain) {
    // Check if the domain might be being served over HTTP.  If so, it isn't
    // safe to secure a cookie!  We can't always know this for sure because
    // observing cookie-changed doesn't give us enough context to know the
    // full origin URI.

    // First, if there are any redirect loops on this domain, don't secure
    // cookies.  XXX This is not a very satisfactory heuristic.  Sometimes we
    // would want to secure the cookie anyway, because the URLs that loop are
    // not authenticated or not important.  Also by the time the loop has been
    // observed and the domain blacklisted, a cookie might already have been
    // flagged as secure.

    if (domain in https_blacklist_domains) {
      this.log(INFO, "cookies for " + domain + "blacklisted");
      return false;
    }

    // If we passed that test, make up a random URL on the domain, and see if
    // we would HTTPSify that.

    try {
      var nonce_path = "/" + Math.random().toString();
      nonce_path = nonce_path + nonce_path;
      var test_uri = "http://" + domain + nonce_path;
    } catch (e) {
      this.log(WARN, "explosion in safeToSecureCookie for " + domain + "\n" 
                      + "(" + e + ")");
      return false;
    }

    this.log(INFO, "Testing securecookie applicability with " + test_uri);
    var rs = this.potentiallyApplicableRulesets(domain);
    for (i = 0; i < rs.length; ++i) {
      if (!rs[i].active) continue;
      var rewrite = rs[i].apply(test_uri);
      if (rewrite) {
        this.log(INFO, "Yes: " + rewrite);
        return true;
      }
    }
    this.log(INFO, "(NO)");
    return false;
  }
};