(function() {
  var global = {
    storage: {
      items: 350,
      pokemon: 250
    },
    snipping: false
  };
  window.global = global;

  global.config = window.configService.load();
  global.version = global.config.version;

  document.title += " - " + global.version;

  function confirmAndSendToServer(msg, callback) {
    if (!global.config.noConfirm) {
      vex.dialog.confirm({
        message: msg,
        callback: (value) => {
          if (value) callback();
        }
      });
    } else {
      callback();
    }
  }

  $(function() {
    inventoryService.init(global.config.locale, launchApp);
  });

  function launchApp() {
    window.ga = window.ga || function() {};

    var sortBy = localStorage.getItem("sortPokemonBy") || "cp";
    $("#sortBy" + sortBy).addClass("active").siblings().removeClass("active");

    $("#pokemonLink").click(function() {
      if ($(".inventory").css("opacity") == "1" && $(".inventory .data .pokemon").length) {
        $(".inventory").removeClass("active");
      } else {
        global.ws.emit('remote:send_request', {
          account: 'DKBot001',
          name: 'pokemon_list',
          args: {}
        });
      }
    });
    $("#eggsLink").click(function() {
      if ($(".inventory").css("opacity") == "1" && $(".inventory .data .egg").length) {
        $(".inventory").removeClass("active");
      } else {
        global.ws.emit('remote:send_request', {
          account: 'DKBot001',
          name: "eggs_list",
          args: {}
        });
      }
    });
    $("#inventoryLink").click(function() {
      if ($(".inventory").css("opacity") == "1" && $(".inventory .data .item").length) {
        $(".inventory").removeClass("active");
      } else {
        global.ws.emit('remote:send_request', {
          account: 'DKBot001',
          name: "inventory_list",
          args: {}
        });
      }
    });

    $("#sortBypokemonId").click(() => global.map.displayPokemonList(null, "pokemonId"));
    $("#sortBycp").click(() => global.map.displayPokemonList(null, "cp"));
    $("#sortByiv").click(() => global.map.displayPokemonList(null, "iv"));
    $("#sortByTime").click(() => global.map.displayPokemonList(null, "creation_time_ms"));

    $("#sortBypokemonId, #sortBycp, #sortByiv, #sortByTime").click(function() {
      if (!$(this).hasClass("active")) {
        $(this).toggleClass("active").siblings().removeClass("active");
      }
    });

    $(".inventory .refresh").click(function() {
      console.log("Refresh");
      global.ws.emit('remote:send_request', {
        account: 'DKBot001',
        name: global.active + "_list",
        args: {}
      });
    });

    $(".inventory .close").click(function() {
      $(this).parent().removeClass("active");
      $(".inventory .sort").hide();
    });

    $(".message .close").click(function() {
      $(this).parent().hide();
    });

    $(".close").click(() => {
      global.active = null
    });

    $("#recycleLink").click(() => {
      sessionStorage.setItem("available", false);
      window.location.reload();
    });

    $("#settingsLink").click(() => {
      global.map.saveContext();
      window.location = "config.html";
    });

    $(".inventory .data").on("click", "a.transferAction", function() {
      var parent = $($(this).parent()).parent();
      var id = parent.data().id;
      var height_m = parent.data().height;
      var creation_time_ms = parent.data().creation_time_ms;
      var weight_kg = parent.data().weight;
      var idx = global.map.pokemonList.findIndex(p => p.id == id);
      var selected = global.map.pokemonList[idx];
      var left = global.map.pokemonList.filter(p => p.pokemonId == selected.pokemonId).length - 1;
      var name = inventoryService.getPokemonName(selected.pokemonId);
      var msg = `Are you sure you want to transfer this ${name}? <br /> You will have <b>${left}</b> left.`;
      confirmAndSendToServer(msg, () => {
        global.ws.emit('remote:send_request', {
          account: 'DKBot001',
          name: 'transfer_pokemon',
          args: {
            pokemon_id: id,
            height: height_m,
            weight: weight_kg,
            creation_time_ms: creation_time_ms
          }
        });
        global.map.pokemonList.splice(idx, 1);
        parent.parent().fadeOut();
      });
    });

    $(".inventory .data").on("click", "a.evolveAction", function() {
      var parent = $($(this).parent()).parent();
      var id = parent.data().id;
      var height_m = parent.data().height;
      var creation_time_ms = parent.data().creation_time_ms;
      var weight_kg = parent.data().weight;
      var idx = global.map.pokemonList.findIndex(p => p.id == id);
      var selected = global.map.pokemonList[idx];
      var left = global.map.pokemonList.filter(p => p.pokemonId == selected.pokemonId).length - 1;
      var name = inventoryService.getPokemonName(selected.pokemonId);
      var msg = `Are you sure you want to evolve this ${name}? <br /> You will have <b>${left}</b> left.`;
      confirmAndSendToServer(msg, () => {
        global.ws.emit('remote:send_request', {
          account: 'DKBot001',
          name: "evolve_pokemon",
          args: {
            pokemon_id: id,
            height: height_m,
            weight: weight_kg,
            creation_time_ms: creation_time_ms
          }
        });
        global.map.pokemonList.splice(idx, 1);
        parent.parent().fadeOut();
      });
    });

    $(".inventory .data").on("click", "a.favoriteAction", function() {
      var parent = $($(this).parent()).parent();
      var id = parent.data().id;
      var height_m = parent.data().height;
      var creation_time_ms = parent.data().creation_time_ms;
      var weight_kg = parent.data().weight;
      var idx = global.map.pokemonList.findIndex(p => p.id == id);
      var selected = global.map.pokemonList[idx];
      selected.favorite = !selected.favorite;
      var name = inventoryService.getPokemonName(selected.pokemonId);
      $(this).find("img").attr('src', `./assets/img/favorite_${selected.favorite ? 'set' : 'unset'}.png`);
            parent.find(".transferAction").toggleClass("hide");
      global.ws.emit('remote:send_request', {
        account: 'DKBot001',
        name: "favorite_pokemon",
        args: {
            pokemon_id: id,
            height: height_m,
            weight: weight_kg,
            creation_time_ms: creation_time_ms,
            favorite: selected.favorite
          }
      });
    });

    $(".inventory .data").on("click", "a.dropItemAction", function() {
      var parent = $(this).parent();
      var itemId = parent.data().id;
      var name = inventoryService.getItemName(itemId)
      var count = parent.data().count;
      var msg = `How many <b>${name}</b> would you like to drop?`;
      vex.dialog.confirm({
        message: msg,
        input: `
                    <p class="range-field">
                        <input type="range" name="count" value="1" min="1" max="${count}" onchange="$('#display-range').text(this.value)" />
                    </p>
                    Drop: <span id='display-range'>1</span>
                `,
        callback: (value) => {
          if (value) {
            var drop = parseInt(value.count);
            global.ws.emit('remote:send_request', {
              account: 'DKBot001',
              name: "discard_item",
              args: {
                item_id: itemId,
                count: drop
              }
            });
                        if (count == drop) {
                            parent.parent().fadeOut();
                        } else {
                            parent.data("count", count - drop);
                            parent.parent().find(".count").text("x" + (count - drop));
                        }
          }
        }
      });
    });

    $(".player").on("pogo:player_update", () => {
      if (global.player) {
        var player = $(".player");
        player.find(".playername .value").text(global.user);
        player.find(".level .value").text(global.player.level);
        var percent = 100 * (global.player.experience - global.player.prev_level_xp) / (global.player.next_level_xp - global.player.prev_level_xp);
        player.find(".myprogress .value").css("width", `${percent.toFixed(0)}%`);
        player.show();
      }
    });

    if (global.config.websocket) {
      // settings ok, let's go
      global.map = new Map("map");
      global.map.loadContext();
      startListenToSocket();
    } else {
      // no settings, first time run?
      window.location = "config.html";
    }
  }

}());