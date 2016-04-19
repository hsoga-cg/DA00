
// ----8< ----

// APIs for demo

handlers.GetNews = function (args) {
	var res = server.GetTitleNews({
		Count: 10
	});
	return	res;
}

// this is not possible because we need a SessionTicket to run cloud script.
//handlers.GetLoginlessUserId = function (args) {
//	// TODO generate unique id
//	var	xc_userid = "514f34bcb0fb22249af4f79a6b3aabd0";
//
//	return	{ xc_userid: xc_userid };
//}

handlers.LoginWithGeneratedId = function (args) {
	var res = server.GetUserInventory({
		PlayFabId: currentPlayerId
	});
	return	res;
}

handlers.GetPlayerBasicInfo = function (args) {
	return	__get_playerbasicinfo(currentPlayerId);
}

function __get_playerbasicinfo(playfabid) {
	var res = server.GetUserInternalData({
		PlayFabId: playfabid,
		Keys: [
			"basic_data"
		]
	});
	var	data0 = res.Data.basic_data;
	if(data0 == undefined) {
		return	{
			player_name: "(undefined)",
			player_level: 1,
			player_exp: 0
		};
	}
	if(data0.player_name == undefined)
		data0.player_name = "(undefined)";
	if(data0.player_level == undefined)
		data0.player_level = 1;
	return	res;
}

handlers.UpdatePlayerName = function (args) {
	if(args.PlayerName == undefined)
		return	{
				error: 500
			};

	var	lockItem = __user_lock_get();

	var	res1 = __get_playerbasicinfo(currentPlayerId);
	res1.player_name = args.PlayerName;

	var res2 = server.UpdateUserInternalData({
		PlayFabId: currentPlayerId,
		Data: {
//			basic_data: {
				player_name: "(undefined 0)",
				player_level: 1,
				player_exp: 0
//			}
		}
	});

	var	resrel = __user_lock_release(lockItem);

	return	res2;
}

handlers.GetPurchasedItemList = function (args) {
	var res = server.GetUserInventory({
		PlayFabId: currentPlayerId
	});
	return	res;
}

handlers.ExchangeTransactionWithItem = function (args) {
	var	catalogver = "00";
	var	itemid = "i_01";

	// TODO consume transaction_id and giving item must be in on transaction.
	// or consuming transaction_id success only once and only one thread that
	// has the successful result must be possible to give an item.

//	var	lockItem = __user_lock_get();
//	if(!lockItem.LockAvailable) {
//		return	{ code: 500 };
//	}

	// TODO resolve catlogver and itemid by transaction_id

	var res = server.GrantItemsToUser({
		CatalogVersion: catalogver,
		PlayFabId: currentPlayerId,
		Annotation: "ExchangeTransactionWithItem",
		ItemIds: [ itemid ]
	});

//	var	resrel = __user_lock_release(lockItem);

	return	res;
}

handlers.ConsumeItem = function (args) {
	var res = server.ConsumeItem({
		PlayFabId: currentPlayerId,
		ItemInstanceId: args.ItemInstanceId,
		ConsumeCount: 1
	});
	return	res;
}

handlers.LotDailyReward = function (args) {

	// limit to only once per a day
	var	limitsecond = 60;	//(60 * 60 * 24);

	var	lockItem = __user_lock_get();
	if(!(lockItem.LockAvailable)) {
		return	{	code: 500, msg: "failed to get user lock."	};
	}

	var resGetUserData = server.GetUserInternalData({
		PlayFabId: currentPlayerId,
		Keys: [ "__sys_datetime_lastlotdailyreward" ]
	});
	var	lastdtobj = resGetUserData.Data["__sys_datetime_lastlotdailyreward"];
	var	currdt = (new Date/1E3|0);
	if(lastdtobj != undefined) {
		var	lastdt = parseInt(lastdtobj.Value, 10);
		if((lastdt + limitsecond) > currdt) {
			if(lockItem.LockAvailable) {
				var	resrel = __user_lock_release(lockItem);
			}
			return	{	code: 500, msg: "reward not yet available, try later."	};
		}
	}

	var updateUserDataResult = server.UpdateUserInternalData({
		PlayFabId: currentPlayerId,
		Data: {
			__sys_datetime_lastlotdailyreward: currdt
		}
	});

	if(lockItem.LockAvailable) {
		var	resrel = __user_lock_release(lockItem);
	}

	// lot an item and give it

	var	catalogver = "00";
	var	possibleitemids = [ "i_01", "i_02", "i_03", ];

	var	itemid = possibleitemids[
		Math.floor(Math.random() * possibleitemids.length)];

	var res = server.GrantItemsToUser({
		CatalogVersion: catalogver,
		PlayFabId: currentPlayerId,
		Annotation: "LotDailyReward",
		ItemIds: [ itemid ]
	});

	return	res;
}

handlers.Error = function (args) {
	var resGetUserData = server.GetUserInternalData({
		PlayFabId: "xxxx",
		Keys: [ "__debug" ]
	});
}

// custom event log is not enabled for titles by default.
// need to contact devrel@playfab.com
handlers.LogEvent = function (args) {
	var res = server.LogEvent({
		PlayFabId: currentPlayerId,
		EventName: args.EventName,
		Body: {
		},
		ProfileSetEvent: true
	});
	return	res;
}

// debug function to confirm server side value on management console
// (replacement of logging)
function __debug_logtext_userinternal(arg_playfabid, logtext) {
	var updateUserDataResult = server.UpdateUserInternalData({
		PlayFabId: arg_playfabid,
		Data: {
			__debug: logtext
		}
	});
}


// ----8< ----

var	__g_testglobal;

//
handlers.helloExtRest = function (args) {
	var	stemp = "";
	var msg0 = "Hello " + currentPlayerId + "!";

	// XXX debug
	var resGetInv = server.GetUserInventory({
		PlayFabId: currentPlayerId
	});

	var	lockItem = __user_lock_get();
	if(lockItem.LockAvailable) {
		msg0 += " (lock acquired. using " + lockItem.ItemInstanceId + ")";
	}

//	// test calling API on another service
//	var restres = http.request("http://nicovideo.jp/");
//	msg0 += ("\n\n restres -> " + restres.substring(0, 400) + " ::::");

	var	resrel = null;
	if(lockItem.LockAvailable) {
		resrel = __user_lock_release(lockItem);
		msg0 += " -> lock released.";
	}

	return {
		message: msg0,
		testglobal: __g_testglobal,
		releaseResult: resrel,
		lockItem: lockItem,
		resGetInv: resGetInv,	// XXX debug
//		grantResult: resGrant,
//		modifyResult: resModify,
//		consumeResult: resConsume1,
//		consumeResult2: resConsume2,
		dummy: stemp
		};
}


handlers.exchangeBillingTrxWithItem = function (args) {
}

function __user_lock_init_or_find() {

	// if there's already one allocated, reuse it
	var resGetUserData = server.GetUserInternalData({
		PlayFabId: currentPlayerId,
		Keys: [ "__sys_userlock_iteminstanceid" ]
	});
	var	lock_iiid = resGetUserData.Data["__sys_userlock_iteminstanceid"];
	if(lock_iiid != undefined) {
		//lock_iiid.Value

		// Remaining count should be 1
		var resGetInv = server.GetUserInventory({
			PlayFabId: currentPlayerId
		});
		for(var idx in resGetInv.Inventory) {
			var	otemp = resGetInv.Inventory[idx];
			if(otemp.ItemId == "__sys_userlock" &&
				otemp.RemainingUses > 0) {
				otemp.AddMsg = "(found in user inventory)";
				return	otemp;
			}
		}

		// there's instance id in user data but that was not found in inventory.
		// -> another thread has the lock
		return	{
			RemainingUses: 0,
			AddMsg: "Lock not available"
			};
	}

	// create new one
	var resGrant = server.GrantItemsToUser({
		CatalogVersion: "00",
		PlayFabId: currentPlayerId,
		Annotation: "system",
		ItemIds: [
			"__sys_userlock"
		]
	});
/*
	var resultsample = {
		ItemGrantResults: [  
			{  
				PlayFabId: "941A46BF4A360962",
				Result: true,
				ItemId: "__sys_userlock",
				ItemInstanceId: "B5D09207887C1A38",
				ItemClass: "system",
				PurchaseDate: "2016-03-31T10:17:15.269Z",
				RemainingUses: 1,
				Annotation: "system",
				CatalogVersion: "00",
				UnitPrice: 0
			}
		]
	};
*/

	// record lock ItemInstanceId in UserInternalData
	if(resGrant.ItemGrantResults.length > 0
		&& resGrant.ItemGrantResults[0].Result == true) {
		var	oret = resGrant.ItemGrantResults[0];
		var lock_iteminstanceid = oret.ItemInstanceId;
		var updateUserDataResult = server.UpdateUserInternalData({
			PlayFabId: currentPlayerId,
			Data: {
				__sys_userlock_iteminstanceid: lock_iteminstanceid
			}
		});
		oret.AddMsg = "returning newly created lock instance";
		return	oret;
	}

	return	null;
}

function __user_lock_get() {
	var	addmsg = "";
	//
	var	lockItem = __user_lock_init_or_find();
	if(lockItem == null) {
		return	{
			LockAvailable: false,
			AddMsg: "failed to get lock."
		};
	} else
	if(lockItem.RemainingUses == 0 ||
		lockItem.RemainingUses > 1) {	// TODO handle case RemainingUses > 1
		lockItem.LockAvailable = false;
		lockItem.AddMsg += " -> failed to get lock. (RemainingUses: "
				+ lockItem.RemainingUses + ") ";
		return	lockItem;
	}
	addmsg += " (get count: " + lockItem.RemainingUses + ") ";

	//
	var resConsume1 = server.ConsumeItem({
		PlayFabId: currentPlayerId,
		ItemInstanceId: lockItem.ItemInstanceId,
		ConsumeCount: 1
	});
	if(resConsume1.RemainingUses == 0) {
		// success
		lockItem.RemainingUses = 0;
		lockItem.LockAvailable = true;
		lockItem.AddMsg = addmsg;
		return	lockItem;
	} else {
		// failed to get user lock
		return	{ LockAvailable: false };
	}
}

function __user_lock_release(lockItem) {
	var	lockItemId = lockItem.ItemInstanceId;
	var	prevremaininguses = lockItem.RemainingUses;

	var	toadd = 1;
	if(prevremaininguses > 1)
		toadd = 1 - prevremaininguses;
	//
	var resModify = server.ModifyItemUses({
		PlayFabId: currentPlayerId,
		ItemInstanceId: lockItemId,
		UsesToAdd: toadd
	});
	if(resModify.RemainingUses == 1) {
		// success
	} else {
		// need to adjust to 1, but possibly it is program bug.
		// log it and maybe better to do manual adjustment
	}
	return	resModify;
}

// ----8< ----

///////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Welcome to your first Cloud Script revision.
// The examples here provide a quick introduction to using Cloud Script and some
// ideas about how you might use it in your game.
//
// There are two approaches for invoking Cloud Script: calling handler functions directly
// from the game client using the "RunCloudScript" API, or triggering Photon Webhooks associated with
// room events. Both approaches are demonstrated in this file. You can use one or the other, or both.
//
// Feel free to use this as a starting point for your game server logic, or to replace it altogether.
// If you have any questions or need advice on where to begin,
// check out the resources at https://playfab.com/cloud-script or check our forums at
// https://support.playfab.com. For issues which are confidential (involving sensitive intellectual
// property, for example), please contact our Developer Success team directly at devrel@playfab.com.
//
// - The PlayFab Team
//
///////////////////////////////////////////////////////////////////////////////////////////////////////


// This is a Cloud Script handler function. It runs in the PlayFab cloud and
// has full access to the PlayFab Game Server API
// (https://api.playfab.com/Documentation/Server). You can invoke the function
// from your game client by calling the "RunCloudScript" API
// (https://api.playfab.com/Documentation/Client/method/RunCloudScript) and
// specifying "helloWorld" for the "ActionId" field.
handlers.helloWorld = function (args) {

    // "currentPlayerId" is initialized to the PlayFab ID of the player logged-in on the game client.
    // Cloud Script handles authenticating the player automatically.
    var message = "Hello " + currentPlayerId + "!";

    // You can use the "log" object to write out debugging statements. The "log" object has
    // three functions corresponding to logging level: debug, info, and error.
    log.info(message);

    // Whatever value you return from a CloudScript handler function is passed back
    // to the game client. It is set in the "Results" property of the object returned by the
    // RunCloudScript API. Any log statments generated by the handler function are also included
    // in the "ActionLog" field of the RunCloudScript result, so you can use them to assist in
    // debugging and error handling.
    return { messageValue: message };
}

// This is a function that the game client would call whenever a player completes
// a level. It updates a setting in the player's data that only game server
// code can write - it is read-only on the client - and it updates a player
// statistic that can be used for leaderboards.
//
// A funtion like this could be extended to perform validation on the
// level completion data to detect cheating. It could also do things like
// award the player items from the game catalog based on their performance.
handlers.completedLevel = function (args) {

    // "args" is set to the value of the "Params" field of the object passed in to
    // RunCloudScript from the client.  It contains whatever properties you want to pass
    // into your Cloud Script function. In this case it contains information about
    // the level a player has completed.
    var level = args.levelName;
    var monstersKilled = args.monstersKilled;

    // The "server" object has functions for each PlayFab server API
    // (https://api.playfab.com/Documentation/Server). It is automatically
    // authenticated as your title and handles all communication with
    // the PlayFab API, so you don't have to write the code to make web requests.
    var updateUserDataResult = server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            lastLevelCompleted: level
        }
    });

    log.debug("Set lastLevelCompleted for player " + currentPlayerId + " to " + level);

    server.UpdateUserStatistics({
        PlayFabId: currentPlayerId,
        UserStatistics: {
            level_monster_kills: monstersKilled
        }
    });

    log.debug("Updated level_monster_kills stat for player " + currentPlayerId + " to " + monstersKilled);
}


// In addition to the Cloud Script handlers, you can define your own functions and call them from your handlers.
// This makes it possible to share code between multiple handlers and to improve code organization.
handlers.updatePlayerMove = function (args) {
    var validMove = processPlayerMove(args);
    return { validMove: validMove };
}


// This is a helper function that verifies that the player's move wasn't made
// too quickly following their previous move, according to the rules of the game.
// If the move is valid, then it updates the player's statistics and profile data.
// This function is called from the "UpdatePlayerMove" handler above and also is
// triggered by the "RoomEventRaised" Photon room event in the Webhook handler
// below. For this example, the script defines the cooldown period (playerMoveCooldownInSeconds)
// as 15 seconds. A recommended approach for values like this would be to create them in Title
// Data, so that they can be queries in the script with a call to
// https://api.playfab.com/Documentation/Server/method/GetTitleData. This would allow you to
// make adjustments to these values over time, without having to edit, test, and roll out an
// updated script.
function processPlayerMove(playerMove) {
    var now = Date.now();
    var playerMoveCooldownInSeconds = 15;

    var playerData = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["last_move_timestamp"]
    });

    var lastMoveTimestampSetting = playerData.Data["last_move_timestamp"];

    if (lastMoveTimestampSetting) {
        var lastMoveTime = Date.parse(lastMoveTimestampSetting.Value);
        var timeSinceLastMoveInSeconds = (now - lastMoveTime) / 1000;
        log.debug("lastMoveTime: " + lastMoveTime + " now: " + now + " timeSinceLastMoveInSeconds: " + timeSinceLastMoveInSeconds);

        if (timeSinceLastMoveInSeconds < playerMoveCooldownInSeconds) {
            log.error("Invalid move - time since last move: " + timeSinceLastMoveInSeconds + "s less than minimum of " + playerMoveCooldownInSeconds + "s.")
            return false;
        }
    }

    var playerStats = server.GetUserStatistics({
        PlayFabId: currentPlayerId
    }).UserStatistics;

    if (playerStats.movesMade)
        playerStats.movesMade += 1;
    else
        playerStats.movesMade = 1;

    server.UpdateUserStatistics({
        PlayFabId: currentPlayerId,
        UserStatistics: playerStats
    });

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            last_move_timestamp: new Date(now).toUTCString()
        }
    });

    return true;
}

// Photon Webhooks Integration
//
// The following functions are examples of Photon Cloud Webhook handlers.
// When you enable Photon integration in the Game Manager, your Photon applications
// are automatically configured to authenticate players using their PlayFab accounts
// and to fire events that trigger your CloudScript Webhook handlers, if defined.
// This makes it easier than ever to incorporate server logic into your game.
//
//  For more information, see https://playfab.com/using-photon-playfab

// Triggered automatically when a Photon room is first created
handlers.RoomCreated = function (args) {
    log.debug("Room Created - Game: " + args.GameId + " MaxPlayers: " + args.CreateOptions.MaxPlayers);
}

// Triggered automatically when a player joins a Photon room
handlers.RoomJoined = function (args) {
    log.debug("Room Joined - Game: " + args.GameId + " PlayFabId: " + args.UserId);
}

// Triggered automatically when a player leaves a Photon room
handlers.RoomLeft = function (args) {
    log.debug("Room Left - Game: " + args.GameId + " PlayFabId: " + args.UserId);
}

// Triggered automatically when a Photon room closes
// Note: currentPlayerId is undefined in this function
handlers.RoomClosed = function (args) {
    log.debug("Room Closed - Game: " + args.GameId);
}

// Triggered automatically when a Photon room game property is updated.
// Note: currentPlayerId is undefined in this function
handlers.RoomPropertyUpdated = function (args) {
    log.debug("Room Property Updated - Game: " + args.GameId);
}

// Triggered by calling "OpRaiseEvent" on the Photon client. The "args.Data" property is
// set to the value of the "customEventContent" HashTable parameter, so you can use
// it to pass in arbitrary data.
handlers.RoomEventRaised = function (args) {
    var eventData = args.Data;
    log.debug("Event Raised - Game: " + args.GameId + " Event Type: " + eventData.eventType);

    switch (eventData.eventType) {
        case "playerMove":
            processPlayerMove(eventData);
            break;

        default:
            break;
    }
}
