var inventory = window.inventoryService;

function setUserName(user) {
  if (!global.user) {
    global.user = user;
    document.title = `[${user}] ${document.title}`;
  }
}

function startTimers() {
  // Get Player Stats every 5 minutes
  window.setInterval(() => {
    if (global.connected) {
      global.ws.emit('remote:send_request', {
        account: 'DKBot001',
        name: 'get_player_stats',
        args: {}
      });
    }
  }, 1000 * 60 * 5);

  // Update pokestop status every minutes
  window.setInterval(() => {
    if (global.connected) {
      global.map.updatePokestopsStatus();
    }
  }, 1000 * 60);
}

function startListenToSocket() {
  inventory.init(global.config.locale);
  console.log("Connecting to " + global.config.websocket);

  startTimers();

  var pkmSettings = localStorage.getItem("pokemonSettings");
  if (pkmSettings) {
    global.pokemonSettings = JSON.parse(pkmSettings);
  } else {
    global.pokemonSettings = {};
  }

  var socket = io.connect(global.config.websocket, {
    transports: ['websocket']
  });
  global.ws = socket;
  window.ws = socket
  var onevent = socket.onevent;
  socket.onevent = function(packet) {
    var args = packet.data || [];
    onevent.call(this, packet); // original call
    packet.data = ["*"].concat(args);
    onevent.call(this, packet); // additional call to catch-all
  };
  socket.on('connect', () => {
    console.log("Connected to Bot, Fetching data");
    $(".loading").text("Waiting to get GPS coordinates from Bot...");
    socket.emit('remote:send_request', {
      account: 'DKBot001',
      name: 'bot_initialized',
      args: {}
    });
  });
  socket.on('disconnect', function() {
    global.connected = false;
  });

  socket.on("*", function(event, data) {
    // console.log(event, data)
    event = event.split(':')[0];
    switch (event) {
      case 'eggs_list':
        data.result.km_walked = data.result.km_walked || 0;
        var incubators = data.result.egg_incubators.filter(i => i.target_km_walked != 0 || i.start_km_walked != 0);
        incubators = Array.from(incubators, i => {
          return {
            type: i.item_id == 901 ? "incubator-unlimited" : "incubator",
            totalDist: i.target_km_walked - i.start_km_walked,
            doneDist: data.result.km_walked - i.start_km_walked
          }
        });
        var eggsInIncub = Array.from(data.result.egg_incubators, i => i.pokemon_id);
        var eggs = Array.from(data.result.eggs.filter(e => eggsInIncub.indexOf(e.id) < 0), i => {
          return {
            type: "egg",
            totalDist: i.egg_km_walked_target,
            doneDist: 0
          }
        });
        global.map.displayEggsList(incubators.concat(eggs));
        break;
      case 'inventory_list':
        //console.log(data.result);
        var items = Array.from(Object.keys(data.result).filter(k => k != "count"), item => {
          var itemid = parseInt(item);
          return {
            item_id: itemid,
            name: inventory.getItemName(itemid),
            count: data.result[item]
          }
        });
        global.map.displayInventory(items);
        break;
      case 'pokemon_list':
        var pkm = Array.from(data.result.pokemon, p => {
          var pkmInfo = global.pokemonSettings[p.pokemon_id - 1] || {};
          var candy = -1;
          for (var i in data.result.candy) {
            if (data.result.candy[i].family_id === pkmInfo.family_id) {
              candy = data.result.candy[i].candy;
              break
            }
          }
          p.individual_attack = p.individual_attack || 0;
          p.individual_defense = p.individual_defense || 0;
          p.individual_stamina = p.individual_stamina || 0
          return {
            id: p.id,
            weight_kg: p.weight_kg,
            creation_time_ms: p.creation_time_ms,
            height_m: p.height_m,
            pokemonId: p.pokemon_id,
            inGym: p.deployed_fort_id != null,
            canEvolve: pkmInfo.evolution_ids && pkmInfo.evolution_ids.length > 0,
            cp: p.cp,
            iv: ((p.individual_attack + p.individual_defense + p.individual_stamina) / 45.0).toFixed(2),
            lvl: inventory.getPokemonLevel(p),
            name: p.nickname || inventory.getPokemonName(p.pokemon_id),
            candy: candy,
            candyToEvolve: pkmInfo.candy_to_evolve,
            favorite: p.favorite == 1,
            move1: inventory.getPokemonMove(p.move_1),
            move2: inventory.getPokemonMove(p.move_2),
            moveFormatted: inventory.getPokemonMoveFormatted(p.pokemon_id, inventory.getPokemonMove(p.move_1), inventory.getPokemonMove(p.move_2)),
            stats: {
              atk: p.individual_attack,
              def: p.individual_defense,
              hp: p.stamina,
              maxHp: p.stamina_max,
              sta: p.individual_stamina
            }
          };
        });
        global.map.displayPokemonList(pkm, null, data.result.eggs_count);
        break;
      case 'get_pokemon_setting':
        global.pokemonSettings = data.result;
        localStorage.setItem("pokemonSettings", JSON.stringify(global.pokemonSettings));
        break
      case 'bot_initialized':
        global.connected = true;
        //if (Array.isArray(msg)) msg = msg.length > 0 ? msg[0] : {};
        if (data.account) {
          console.log("Bot Ready.");
          setUserName(data.account);
          global.player = data.result.player;
          if (global.player) {
            $(".player").trigger("pogo:player_update");
            // ga("send", "event", "level", global.player.level);
          }
          if (data.result.storage) {
            global.storage = {
              pokemon: data.result.storage.max_pokemon_storage,
              items: data.result.storage.max_item_storage
            }
          }
          global.map.addToPath({
            lat: data.result.coordinates[0],
            lng: data.result.coordinates[1]
          });
        }
        $(".toolbar div").show();
        global.ws.emit('remote:send_request', {
          account: 'DKBot001',
          name: 'get_pokemon_setting',
          args: {}
        });
        break;
      case 'position_update':
        global.map.addToPath({
          lat: data.data.current_position[0],
          lng: data.data.current_position[1]
        });
        break
      case 'spun_pokestop':
        // console.log("Pokestop Visited", data);
        global.map.addVisitedPokestop({
          id: data.data.pokestop.id,
          name: data.data.pokestop.name,
          lat: data.data.pokestop.latitude,
          lng: data.data.pokestop.longitude,
          cooldown: parseInt(data.data.pokestop.cooldown_complete_timestamp_ms) || null,
          lureExpire: parseInt(data.data.pokestop.lure_expires_timestamp_ms) || null,
          visited: true
        });
        break;
      case 'pokemon_caught':
        // console.log("Pokemon caught", data.data);
        var pokemon = {
          pokemon_id: data.data.pokemon_id,
          combat_power: data.data.cp,
          potential: data.data.iv
        };
        var pkm = {
          id: pokemon.pokemon_id,
          name: inventory.getPokemonName(pokemon.pokemon_id),
          cp: pokemon.combat_power,
          iv: (pokemon.potential * 100).toFixed(1),
          lvl: inventory.getPokemonLevel(pokemon)
        };

        pkm.lat = data.data.latitude;
        pkm.lng = data.data.longitude;

        global.map.addCatch(pkm);
        pokemonToast(pkm, {
          ball: pokemon.pokeball
        });
        break;
      case 'get_player_stats':
        console.log('get_player_stats', data)
        global.player = data.result;
        $(".player").trigger("pogo:player_update");
        break;
      case 'evolve_pokemon':
         //console.log(msg);
        var info = {
          id: data.result.pokemon.pokemon_id,
          name: inventory.getPokemonName(data.result.pokemon.pokemon_id)
        };
        pokemonToast(info, {
          title: `A Pokemon Evolved to ${info.name}` 
        });
        break;
      default:
        // console.log(event, data)
        break;
    }
  });

  socket.on('pokestops', msg => {
    var forts = Array.from(msg.pokestops.filter(f => f.fort_type == 1), f => {
      return {
        id: f.fort_id,
        lat: f.latitude,
        lng: f.longitude,
        cooldown: parseInt(f.cooldown_timestamp_ms) || null,
        lureExpire: parseInt(f.lure_expires_timestamp_ms) || null
      }
    });
    global.map.addPokestops(forts);
  });

  socket.on("route", route => {
    global.map.setRoute(Array.from(route, pt => {
      return {
        lat: pt[0],
        lng: pt[1]
      }
    }));
  });
}

function errorToast(message) {
  toastr.error(message, "Error", {
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "5000",
    "closeButton": true
  });
}

function pokemonToast(pkm, options) {
  if (global.config.noPopup) return;

  options = options || {};
  var title = options.title || (global.snipping ? "Snipe success" : "Catch success");
  var toast = global.snipping ? toastr.success : toastr.info;
  var pkminfo = pkm.name;
  if (pkm.lvl) pkminfo += ` (lvl ${pkm.lvl})`;

  var content = `<div>${pkminfo}</div><div>`;
  content += `<img src='./assets/pokemon/${pkm.id}.png' height='50' />`;
  if (options.ball) content += `<img src='./assets/inventory/${options.ball}.png' height='30' />`;
  content += `</div>`;
  toast(content, title, {
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": 5000,
    "closeButton": true
  })
}
