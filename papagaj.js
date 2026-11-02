var cellContents = Array(); 

var highlightRun = 0;
var prehravaSaSekvencia = false;
var vyhodnocujeSa = false;
var spravna_odpoved = 0;
var ziakSlovickoIndex = 0;
var ziakImageBase64 = "";
var ziakSelectedKeys = {};

$( document ).ready(function() {

	setInterval(timerMethod, 600000); 
	addCustomInformation();
	$("#papagaj_kalendar").datepicker({
		dateFormat: 'yy-mm-dd',
		maxDate: 2,
		minDate: "-1y",
		firstDay: 1,
		//"setDate": $("my_hidden_input").val(),
		//defaultDate: $("my_hidden_input").val(),
		beforeShowDay: function(date) {
			if($.inArray($.datepicker.formatDate('yy-mm-dd', date ), Object.keys(cellContents)) > -1)
			{
				cellContents[$.inArray($.datepicker.formatDate('yy-mm-dd', date ), Object.keys(cellContents))]
				var pocet = cellContents[$.datepicker.formatDate('yy-mm-dd', date )];
				var pocet_kor = pocet;
				if(pocet>12) {pocet_kor = 12;}
				return [true,"heap_"+pocet_kor,pocet + " "+PapagajBalicek(pocet)];
			} else {
				return [false,"heap_0",""];
			}
		},
	onChangeMonthYear: function(year, month) { 
		  addCustomInformation(year,month);
	},
	onSelect: function(date) {
			var url = window.location.href;  
			const urlObj = new URL(url);

			const params = new URLSearchParams(urlObj.search);
			params.delete('den');
			params.set('den', date);
			//window.location.href =  location.origin + location.pathname + "?" + params.toString();
			ZobrazKalendar(params.get("den"));
			return false;
		}
	}).datepicker('setDate', $("#papagaj_kalendar").attr("data-date"));

	if (window.location.href.indexOf("showkurzy") > -1) {
		$("#sidebar_left .kurzy").addClass("click");
		ShowKurzy();
	}
	
	setTimeout(function(){
		if (window.location.href.indexOf("showkurzy") > -1) {
			
			$("#sidebar_left .kurzy").removeClass("click")
		}
	},500);
	
	if (window.location.href.indexOf("showknihy") > -1) {
		$("#sidebar_left .knihy").addClass("click");
		ShowKnihy();
	}
	
	setTimeout(function(){
		if (window.location.href.indexOf("showknihy") > -1) {
			//ShowKnihy();
			$("#sidebar_left .knihy").removeClass("click")
		}
	},500);

	var ziakBalickyParams = new URLSearchParams(window.location.search);
	if (ziakBalickyParams.has("ziak_balicky")) {
		ShowZiakBalicky(
			ziakBalickyParams.get("ziak_balicky") || 0,
			ziakBalickyParams.get("jazyk") || 0
		);
	} else {
		InitZiakBalicekForm();
	}

  });

  function InitZiakBalicekForm()
  {
	var form = $("#ziak-balicek-form");
	var questionInput = $("#ziak-question");
	if(!form.length)
	{
		return;
	}

	ziakSlovickoIndex = 0;
	ziakImageBase64 = "";
	ziakSelectedKeys = {};

	$("#ziak-slovicka-rows").children(".ziak-existing-row[data-selected-key]").each(function() {
		var key = $(this).attr("data-selected-key");
		if(key)
		{
			ziakSelectedKeys[key] = true;
		}
	});

	$("#ziak-balicek-nazov").off("input.ziakBalicek").on("input.ziakBalicek", ZiakBalicekRefreshReady);

	if(questionInput.data("ui-autocomplete"))
	{
		questionInput.autocomplete("destroy");
	}

	if($.fn.autocomplete) {
		questionInput.autocomplete({
			source: function(request, response) {
				if(!ZiakBalicekRefreshReady()) {
					response([]);
					return;
				}
				$.ajax({
					url: "papagaj.php",
					dataType: "json",
					data: {
						action: "ziak_slovicka_input",
						search: request.term,
						jazyky_id: ZiakBalicekCurrentLang()
					},
					success: function(data) {
						response(data);
					}
				});
			},
			minLength: 1,
			select: function(event, ui) {
				return ZiakBalicekAddSelected(ui.item);
			}
		});

		if(questionInput.autocomplete("instance")) {
			questionInput.autocomplete("instance")._renderItem = function(ul, item) {
				var term = this.term.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
				var newText = String(item.question).replace(new RegExp(term, "gi"), "<span class='ui-state-highlight'>$&</span>");
				var icon = item.icon ? "<img class='mini_img' src='" + ZiakBalicekEscape(item.icon) + "' alt=''>" : "";
				return $("<li class='gsearch'>")
					.append("<div class='gsearch-content'><div class='full'><strong>" + newText + "</strong><br><small>" + ZiakBalicekEscape(item.answer) + "</small></div>" + icon + "</div>")
					.appendTo(ul);
			};

			var menu = questionInput.autocomplete("widget");
			menu.off(".ziakBalicekActive")
				.on("menufocus.ziakBalicekActive", function(event, ui) {
					menu.children(".gsearch").removeClass("ui-state-active");
					ui.item.addClass("ui-state-active");
					ui.item.children(".ui-menu-item-wrapper").removeClass("ui-state-active");
				})
				.on("menublur.ziakBalicekActive", function() {
					menu.children(".gsearch").removeClass("ui-state-active");
				});
			questionInput.off("autocompleteclose.ziakBalicekActive").on("autocompleteclose.ziakBalicekActive", function() {
				menu.children(".gsearch").removeClass("ui-state-active");
			});
		}
	}

	var currentLang = ZiakBalicekCurrentLang();
	if(currentLang > 0) {
		ZiakBalicekSetLang(currentLang);
	}
	else {
		ZiakBalicekRefreshReady();
	}
	ZiakBalicekRefreshEmpty();
  }

  function ZiakBalicekCurrentLang() {
	var checked = document.querySelector('input[name="jazyky_id"]:checked');
	return checked ? parseInt(checked.value, 10) : 0;
  }

  function ZiakBalicekHasName() {
	return $("#ziak-balicek-nazov").val().trim() !== "";
  }

  function ZiakBalicekCanEditWords() {
	var id = ZiakBalicekCurrentLang();
	return ZiakBalicekHasName() && id > 0 && $('.ziak-language-picker input[name="jazyky_id"][value="' + id + '"]').length > 0;
  }

  function ZiakBalicekRefreshReady() {
	var ready = ZiakBalicekCanEditWords();
	$("#ziak-word-panel").toggleClass("is-disabled", !ready);
	$("#ziak-question, #ziak-answer, #ziak-image-input, #ziak-add-word-button, #ziak-excel-text, #ziak-excel-button, #ziak-excel-find-image").prop("disabled", !ready);
	return ready;
  }

  function ZiakBalicekQuestionPlaceholder(icon) {
	var placeholders = {
		eng: "anglicky",
		ger: "nemecky",
		spa: "španielsky",
		fre: "francúzsky",
		rus: "rusky",
		ita: "taliansky",
		svk: "slovensky"
	};
	return placeholders[icon] || "";
  }

  function ZiakBalicekSetLang(id) {
	var input = $('.ziak-language-picker input[name="jazyky_id"][value="' + id + '"]');
	if(!input.length) {
		ZiakBalicekRefreshReady();
		return;
	}
	$(".ziak-language-picker label").removeClass("active");
	input.closest("label").addClass("active");
	$("#ziak-question-img").attr("src", zborovna_url + "gui/vyhladavanie/" + input.attr("data-question") + ".gif");
	$("#ziak-answer-img").attr("src", zborovna_url + "gui/vyhladavanie/" + input.attr("data-answer") + ".gif");
	var questionPlaceholder = $("#ziak-question").attr("data-placeholder");
	var questionLang = ZiakBalicekQuestionPlaceholder(input.attr("data-question"));
	if(questionPlaceholder && questionLang) {
		$("#ziak-question").attr("placeholder", questionPlaceholder.replace("[JAZYK]", questionLang));
	}
	ZiakBalicekRefreshReady();
  }

  function ZiakBalicekEscape(text) {
	return String(text).replace(/[&<>"']/g, function(character) {
		return {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		}[character];
	});
  }

  function ZiakBalicekResetInput() {
	$("#ziak-question").val("");
	$("#ziak-answer").val("");
	$("#ziak-image-input").val("");
	$("#ziak-image-preview").html("Obrázok");
	ziakImageBase64 = "";
  }

  function ZiakBalicekRefreshEmpty() {
	var count = $("#ziak-slovicka-rows").children(".ziak-added-word, .ziak-existing-row").length;
	$("#ziak-empty-words").toggle(count === 0);
  }

  function ZiakBalicekAddSelected(item) {
	if(!ZiakBalicekRefreshReady()) {
		alert("Najprv zadaj názov balíčka a vyber jazyk.");
		return false;
	}
	var key = (item.vlastne == 1 ? "v" : "m") + "_" + item.id;
	if(ziakSelectedKeys[key]) {
		ZiakBalicekResetInput();
		return false;
	}
	ziakSelectedKeys[key] = true;
	var name = item.vlastne == 1 ? "new_select_slovicka_vlastne[]" : "new_select_slovicka_moz[]";
	var icon = item.icon ? '<img src="' + ZiakBalicekEscape(item.icon) + '" alt="">' : '<span class="ziak-existing-placeholder"></span>';
	var html = '<div class="ziak-existing-row ziak-added-word" data-selected-key="' + key + '">'
		+ '<div class="ziak-existing-word">' + icon + '<div><strong>' + ZiakBalicekEscape(item.question) + '</strong><span>' + ZiakBalicekEscape(item.answer) + '</span></div></div>'
		+ '<input type="hidden" name="' + name + '" value="' + parseInt(item.id, 10) + '">'
		+ '<button type="button" class="small ziak-remove-row" onclick="ZiakBalicekRemoveWord(this, \'' + key + '\')">Zmazať</button>'
		+ '</div>';
	$("#ziak-slovicka-rows").prepend(html);
	ZiakBalicekResetInput();
	ZiakBalicekRefreshEmpty();
	return false;
  }

  function ZiakBalicekToggleExcel() {
	$("#ziak-excel-import").stop(true, true).slideToggle(150);
  }

  function ZiakBalicekAddManualWord(question, answer, options) {
	var index = ziakSlovickoIndex++;
	options = options || {};
	var imageBase64 = options.base64 || "";
	var imagePreview = options.preview || imageBase64;
	var imageLookupType = options.lookupType || "";
	var imageLookupId = parseInt(options.lookupId || 0, 10);
	var image = imagePreview ? '<img src="' + ZiakBalicekEscape(imagePreview) + '" alt="">' : '<span class="ziak-existing-placeholder"></span>';
	var html = '<div class="ziak-existing-row ziak-added-word">'
		+ '<div class="ziak-existing-word">' + image + '<div><strong>' + ZiakBalicekEscape(question) + '</strong><span>' + ZiakBalicekEscape(answer) + '</span></div></div>'
		+ '<input type="hidden" name="new_slovicka[' + index + '][znenie]" value="' + ZiakBalicekEscape(question) + '">'
		+ '<input type="hidden" name="new_slovicka[' + index + '][odpoved_spravna]" value="' + ZiakBalicekEscape(answer) + '">'
		+ '<input type="hidden" name="new_slovicka[' + index + '][vlozeny_obr]" value="' + (imageBase64 ? '1' : '0') + '">'
		+ '<input type="hidden" name="new_slovicka[' + index + '][obrazok_base64]" value="' + ZiakBalicekEscape(imageBase64) + '">'
		+ '<input type="hidden" name="new_slovicka[' + index + '][image_lookup_type]" value="' + ZiakBalicekEscape(imageLookupType) + '">'
		+ '<input type="hidden" name="new_slovicka[' + index + '][image_lookup_id]" value="' + parseInt(imageLookupId, 10) + '">'
		+ '<button type="button" class="small ziak-remove-row" onclick="ZiakBalicekRemoveWord(this)">Zmazať</button>'
		+ '</div>';
	$("#ziak-slovicka-rows").prepend(html);
	ZiakBalicekRefreshEmpty();
	return true;
  }

  function ZiakBalicekAddManual() {
	if(!ZiakBalicekRefreshReady()) {
		alert("Najprv zadaj názov balíčka a vyber jazyk.");
		return false;
	}
	var question = $("#ziak-question").val().trim();
	var answer = $("#ziak-answer").val().trim();
	if(question.length < 1 || answer.length < 1) {
		alert("Vyplň slovíčko aj preklad.");
		return false;
	}
	ZiakBalicekAddManualWord(question, answer, {base64: ziakImageBase64});
	ZiakBalicekResetInput();
	return true;
  }

  function ZiakBalicekRemoveWord(button, key) {
	if(key) {
		delete ziakSelectedKeys[key];
	}
	$(button).closest(".ziak-existing-row").remove();
	ZiakBalicekRefreshEmpty();
  }

  function ZiakBalicekParseExcelRows(text) {
	var rows = [];
	var skipped = 0;
	var complete = 0;
	var lines = String(text).split(/\r?\n/);
	lines.forEach(function(line) {
		if(line.trim() === "") {
			return;
		}
		var columns = line.split("\t");
		if(columns.length < 2 && line.indexOf(";") !== -1) {
			columns = line.split(";");
		}
		if(columns.length < 2 && line.indexOf(",") !== -1) {
			columns = line.split(",");
		}
		var question = (columns[0] || "").trim();
		var answer = (columns[1] || "").trim();
		if(question === "" || answer === "") {
			skipped++;
			return;
		}
		complete++;
		if(rows.length < 25) {
			rows.push({
				question: question,
				answer: answer
			});
		}
	});
	return {
		rows: rows,
		skipped: skipped,
		limited: complete > rows.length
	};
  }

  function ZiakBalicekSetExcelStatus(text) {
	$("#ziak-excel-status").text(text || "");
  }

  function ZiakBalicekApplyLookupMatches(rows, matches) {
	if(!matches) {
		return rows;
	}
	$.each(matches, function(key, match) {
		var index = parseInt(key, 10);
		if(isNaN(index) || !rows[index] || !match || !match.type || !match.id) {
			return;
		}
		rows[index].image_lookup_type = match.type;
		rows[index].image_lookup_id = parseInt(match.id, 10);
		rows[index].icon = match.icon || "";
	});
	return rows;
  }

  function ZiakBalicekAddExcelRows(rows, skipped, limited) {
	var imageCount = 0;
	for(var i = rows.length - 1; i >= 0; i--) {
		var row = rows[i];
		if(row.image_lookup_type && parseInt(row.image_lookup_id || 0, 10) > 0) {
			imageCount++;
		}
		ZiakBalicekAddManualWord(row.question, row.answer, {
			preview: row.icon || "",
			lookupType: row.image_lookup_type || "",
			lookupId: row.image_lookup_id || 0
		});
	}
	$("#ziak-excel-text").val("");
	var message = "Pridaných " + rows.length + " slovíčok.";
	if(imageCount > 0) {
		message += " Obrázok sa našiel pri " + imageCount + " slovíčkach.";
	}
	if(limited) {
		message += " Limit je 25.";
	}
	if(skipped > 0) {
		message += " Preskočených neúplných riadkov: " + skipped + ".";
	}
	ZiakBalicekSetExcelStatus(message);
  }

  function ZiakBalicekSwapExcelRows(rows) {
	return rows.map(function(row) {
		return {
			question: row.answer,
			answer: row.question
		};
	});
  }

  function ZiakBalicekImportRows(rows, skipped, limited) {
	if(!$("#ziak-excel-find-image").is(":checked")) {
		ZiakBalicekAddExcelRows(rows, skipped, limited);
		$("#ziak-excel-button, #ziak-excel-find-image").prop("disabled", !ZiakBalicekCanEditWords());
		return;
	}

	ZiakBalicekSetExcelStatus("Hľadám obrázky...");
	$.ajax({
		type: "POST",
		url: "papagaj.php",
		dataType: "json",
		data: {
			action: "ziak_slovicka_lookup_images",
			jazyky_id: ZiakBalicekCurrentLang(),
			rows: rows
		},
		success: function(data) {
			ZiakBalicekApplyLookupMatches(rows, data);
			ZiakBalicekAddExcelRows(rows, skipped, limited);
		},
		error: function() {
			ZiakBalicekAddExcelRows(rows, skipped, limited);
		},
		complete: function() {
			$("#ziak-excel-button, #ziak-excel-find-image").prop("disabled", !ZiakBalicekCanEditWords());
		}
	});
  }

  function ZiakBalicekImportExcel() {
	if(!ZiakBalicekRefreshReady()) {
		alert("Najprv zadaj názov balíčka a vyber jazyk.");
		return false;
	}
	var parsed = ZiakBalicekParseExcelRows($("#ziak-excel-text").val());
	if(parsed.rows.length === 0) {
		alert("Vlož aspoň jeden úplný riadok so slovíčkom a prekladom.");
		return false;
	}
	var sample = parsed.rows.slice(0, 5);
	var left = sample.map(function(row) { return row.question; });
	var right = sample.map(function(row) { return row.answer; });
	$("#ziak-excel-button, #ziak-excel-find-image").prop("disabled", true);
	ZiakBalicekSetExcelStatus("Kontrolujem stĺpce...");
	$.ajax({
		type: "POST",
		url: "papagaj.php",
		dataType: "json",
		data: {
			action: "ziak_slovicka_detect_columns",
			jazyky_id: ZiakBalicekCurrentLang(),
			left: left,
			right: right
		},
		success: function(data) {
			var rows = parsed.rows;
			if(data && data.swap && confirm("Zdá sa, že slovíčko a preklad sú v Exceli opačne. Chceš stĺpce otočiť?")) {
				rows = ZiakBalicekSwapExcelRows(rows);
			}
			ZiakBalicekImportRows(rows, parsed.skipped, parsed.limited);
		},
		error: function() {
			ZiakBalicekImportRows(parsed.rows, parsed.skipped, parsed.limited);
		}
	});
	return false;
  }

  function ZiakBalicekImage(input) {
	var file = input.files && input.files[0];
	if(!file) {
		ziakImageBase64 = "";
		$("#ziak-image-preview").html("Obrázok");
		return;
	}
	if(!file.type.match(/^image\//)) {
		alert("Vyber obrázok.");
		input.value = "";
		return;
	}
	if(file.size > 2097152) {
		alert("Obrázok môže mať najviac 2 MB.");
		input.value = "";
		return;
	}
	var reader = new FileReader();
	reader.onload = function(event) {
		ziakImageBase64 = event.target.result;
		$("#ziak-image-preview").html('<img src="' + ZiakBalicekEscape(ziakImageBase64) + '" alt="">');
	};
	reader.readAsDataURL(file);
  }

  function ZiakBalicekBeforeSubmit(form) {
	var nazov = form.querySelector('[name="nazov"]').value.trim();
	if(nazov === "") {
		alert("Napíš názov balíčka.");
		return false;
	}
	if(!ZiakBalicekCurrentLang()) {
		alert("Vyber jazyk balíčka.");
		return false;
	}
	if($("#ziak-question").val().trim() !== "" || $("#ziak-answer").val().trim() !== "") {
		if(!ZiakBalicekAddManual()) {
			return false;
		}
	}
	if($("#ziak-excel-text").val().trim() !== "") {
		alert("Najprv pridaj slovíčka z Excelu tlačidlom Pridať slovíčka.");
		return false;
	}
	if($("#ziak-slovicka-rows").children(".ziak-added-word, .ziak-existing-row").length === 0) {
		alert("Pridaj aspoň jedno slovíčko.");
		return false;
	}
	return true;
  }

  function ChangeSkupina(predmet, dieta_id)
  {
	$.ajax({
		type: "GET",
		url: "papagaj.php",
		dataType: 'json',
		data: {action: "set_skupina", id: predmet, child_id: dieta_id},
		success: function(msg){
			location.replace('/papagaj.php');
			//$("#skupina_select").html(msg.select);
			//RefreshBalicky();
			//if(api != undefined)
			//{
			//	api.open();
			//}

		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			toastr.error(nazov, "Pri nastavovaní nastala nečakaná chyba.", {timeOut: 5000})
		}
		});
		return false;
  }
  function StiahniDiplom(sk_id) {
	var link = document.createElement('a');
	link.href = "?action=stiahni_diplom&id="+sk_id;
	link.download = "diplom_" + new Date() + ".pdf";
	link.click();
	link.remove();
	
  }
  function timerMethod() {


	var cislo = Math.random()*10000;		
		$.post("/keepalive.php?rand="+cislo, function(data) {
			if (data==1)
			{
				console.log("OK");
			}			  
		})
		.fail(function() 
		{ 
			new jBox('Notice', {
				content: 'Chyba spojenia so serverom! Prosím počkajte kým sa spojenie neobnoví.',
				attributes: {
					x: 'right',
					y: 'top'
				}
			});
		});

}
function clearActiveAnswers() {
    $('.answer_button').removeClass('active');
}

function lockAnswers(lock) {
    $('.answer_button').prop('disabled', lock);
}

function wait(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}
function SetAnswer(button)
{
	if (vyhodnocujeSa) return;

	if (prehravaSaSekvencia) {
        highlightRun++;
        prehravaSaSekvencia = false;
        clearActiveAnswers();
        stopGlobalAudio();
        lockAnswers(false);
    }
	$("#overlay_papagaj").show();

	$(button).prop("disabled", true);
	//$(button).attr("onclick",false);
	var answer_val = $(button).attr("id");
    var q_val = $("#question_id").val();

	 // ak už poznáme správnu odpoveď, ďalší request netreba
    if (spravna_odpoved != 0) {
        Vyhodnot(button, spravna_odpoved, answer_val);
        return;
    }

	vyhodnocujeSa = true;

	
	let ids = $("button.answer_button").map(function() {
		return $(this).attr("id");
	}).get();
	$.post( "papagaj.php", { action: "set_answer",typ:"test", answer: answer_val,  q: q_val, all_a : ids 	
	}, function(obj) {
        vyhodnocujeSa = false;

        if (obj.stav == 1) {
            spravna_odpoved = obj.correct_answer_id;

            if (obj.percenta && obj.skupina_balicek_id) {
                $("#balicek_" + obj.skupina_balicek_id + "_per")
                    .attr("aria-valuenow", obj.percenta)
                    .css("width", obj.percenta + "%")
                    .html(obj.percenta + "%");
            }

            Vyhodnot(button, spravna_odpoved, answer_val);
        }
        else {
            $("#overlay_papagaj").hide();
            $(button).prop("disabled", false);

            new jBox('Notice', {
                content: 'Nastala chyba, akciu opakujte neskôr prosím.',
                attributes: {
                    x: 'right',
                    y: 'top'
                }
            });
        }
    }, 'json').fail(function() {
        vyhodnocujeSa = false;
        $("#overlay_papagaj").hide();
        $(button).prop("disabled", false);

        new jBox('Notice', {
            content: 'Nastala chyba spojenia so serverom.',
            attributes: {
                x: 'right',
                y: 'top'
            }
        });
    });
}
  function addCustomInformation(year_val, mesiac_val) 
  {
	var url = window.location.href;  
	const urlObj = new URL(url);

	const params = new URLSearchParams(urlObj.search);
	//	var typ_val = params.get('type');
	  var loadUrl 		= "papagaj.php";
	  var action_val 	= "get_skupina_count";
	  $.post(loadUrl, {mesiac : mesiac_val,year : year_val, params : encodeURIComponent(params.toString()), action: action_val}, function(data) {
			cellContents = data;
			$( "#papagaj_kalendar" ).datepicker("refresh");
		}, 'json');
		
  }
  function ShowStats(scope_val)
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "stats";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {scope : scope_val, action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				if($("#content .mobil").hasClass("full"))
				{
					$("#content .mobil").removeClass("full");
				}
				$("#main_content").html(msg);
				if($('#sidebar_left').hasClass('mm-opened'))
				{
					if(api != undefined){
						api.close();
					}
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
  }    
  function SetKurz(check, nazov, idecko)
  {
	var stav_var = $("#check"+idecko).is(':checked');
	$.ajax({
		type: "GET",
		url: "papagaj.php",
		dataType: 'json',
		data: {action: "set_kurz", id: idecko, stav: stav_var},
		success: function(msg){
			toastr.success(nazov, msg.text, {timeOut: 5000})
			$("#skupina_select").html(msg.select);
			if($("#skupina_select .skupina_row ").length > 0)
			{
				$('#aktualny-skupina').show();
			}
			else{
				$('#aktualny-skupina').hide();
			}
			
			//RefreshBalicky();
			if(api != undefined)
			{
				api.open();
			}
			//if(msg.pocet == 0){
			if(stav_var){
				window.setTimeout(function(){location.replace('/papagaj.php');}, 2000);
			}
			//}

		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			toastr.error(nazov, "Pri nastavovaní nastala nečakaná chyba.", {timeOut: 5000})
		}
		});
		
  }
  function ShowKurzy()
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "kurzy";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				$("#main_content").html(msg);
				$("#content .mobil").addClass("full");
				if($('#sidebar_left').hasClass('mm-opened'))
				{
					if(api != undefined){
						api.close();
					}
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
  }    
  function ShowZiakBalicky(id, jazyk)
  {
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: "ziak_balicky", id: id || 0, jazyk: jazyk || 0},
			success: function(msg){
				$("#overlay_papagaj").hide();
				$("#main_content").html(msg);
				InitZiakBalicekForm();
				$("#content .mobil").addClass("full");
				if($('#sidebar_left').hasClass('mm-opened'))
				{
					if(api != undefined){
						api.close();
					}
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				if (XMLHttpRequest.getResponseHeader("X-Bezkriedy-Premium-Required") === "1") {
					window.location.href = "/papagaj.php?action=premium_required";
					return;
				}
				alert("Pri spúšťaní nastala nečakaná chyba.");
				$("#overlay_papagaj").hide();
			}
		  });
  }
  function ShowSutazKniha(idecko_skupiny)
  {
		//console.log('run pap'+balicek_val);
		if(idecko_skupiny > 0){
			$.ajax({
				type: "GET",
				url: "papagaj.php",
				dataType: 'json',
				data: {action: "set_skupina", id: idecko_skupiny},
				success: function(msg){
					location.replace('/papagaj.php');
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					toastr.error(nazov, "Pri nastavovaní nastala nečakaná chyba.", {timeOut: 5000})
				}
			});
		}
		else{
			location.replace('/papagaj.php?action=sutaz_kniha');
		}
		
		return false;
  }   
  function ShowKnihy()
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "knihy";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				$("#main_content").html(msg);
				$("#content .mobil").addClass("full");
				if($('#sidebar_left').hasClass('mm-opened')) 
				{
					if(api != undefined){
						api.close();
					}
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
  }  
  function ZobrazKalendar(den_val)
  {
		$("#balicky_dna").show();
		$("#posledne_balicky").empty();
		$("#posledne_balicky").hide();

		var action_val 	= "show_calendar";
		//show overlay
		$("#overlay_balicky_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: action_val, den: den_val},
			success: function(msg){
				$("#overlay_balicky_papagaj").hide();
				$("#sidebar_left #balicky_dna_wrapper").html(msg);
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				alert("Pri spúštani nastala nečakaná chyba.");
				$("#overlay_balicky_papagaj").hide();
			}
		});
  }
  function RunBalicek(balicek_val)
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "run_volba_levelu";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {id : balicek_val, action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				if($("#content .mobil").hasClass("full"))
				{
					$("#content .mobil").removeClass("full");
				}
				$("#main_content").html(msg);
				if($('#sidebar_left').hasClass('mm-opened')) 
				{
					if(api != undefined){
						api.close();
					}
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
  }  
  function RunBalicekLevel(balicek_val, level_val)
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "run";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {id : balicek_val, level: level_val, action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				if($("#content .mobil").hasClass("full"))
				{
					$("#content .mobil").removeClass("full");
				}
				$("#main_content").html(msg);
				if($('#sidebar_left').hasClass('mm-opened')) 
				{
					if(api != undefined){
						api.close();
					}
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
  }   
  function RunNewBalicek(balicek_val)
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "run_new_balicek";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {id : balicek_val, action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				if($("#content .mobil").hasClass("full"))
				{
					$("#content .mobil").removeClass("full");
				}
				$("#main_content").html(msg);
				if($('#sidebar_left').hasClass('mm-opened')) 
				{
					if(api != undefined){
						api.close();
					}
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
		  //RefreshBalicky();
  }  
  function RefreshBalicky()
  {
	return;
		//console.log('run pap'+balicek_val);
		var action_val 	= "refresh_balicek";
		//show overlay
		
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: action_val},
			success: function(msg){
				if(msg){
					$("#sidebar_left #posledne_balicky").html(msg);
				}
			},
			error: function() {
				location.replace('/papagaj.php');
			 }
		  });
  }  
  function RefreshMozgyCount()
  {
	return;
		RefreshSutazProgress();
		//console.log('run pap'+balicek_val);
		var action_val 	= "refresh_mozgy_count";
		//show overlay
		
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: action_val},
			success: function(msg){
				if(msg){
					$("#sidebar_left #level_mozgo").html(msg);
				}
				
			}
		  });
  }   
  function RefreshSutazProgress()
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "refresh_sutaz_progress";
		//show overlay
		
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {action: action_val},
			success: function(msg){
				if(msg){
					$("#sidebar_left #level_sutaz").html(msg);
				}
				
			}
		  });
  }  
  function RunBalicekVolba(balicek_val)
  {
		//console.log('run pap'+balicek_val);
		var action_val 	= "run_volba";
		//show overlay
		$("#overlay_papagaj").show();
		$.ajax({
			type: "GET",
			url: "papagaj.php",
			data: {id : balicek_val, action: action_val},
			success: function(msg){
				$("#overlay_papagaj").hide();
				if($("#content .mobil").hasClass("full"))
				{
					$("#content .mobil").removeClass("full");
				}
				$("#main_content").html(msg);
				if($('#sidebar_left').hasClass('mm-opened')) 
				{
					if(api != undefined){
						api.close();
					}
				}
				
					
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
			   alert("Pri spúštani nastala nečakaná chyba.");
			   $("#overlay_papagaj").hide();
			}
		  });
  }  
  function RunBalicekUcenie(balicek_val)
  {
	//console.log('run pap'+balicek_val);
	var action_val 	= "run_ucenie";
	//show overlay
	$("#overlay_papagaj").show();
	$.ajax({
		type: "GET",
		url: "papagaj.php",
		data: {id : balicek_val, action: action_val},
		success: function(msg){
			$("#overlay_papagaj").hide();
			if($("#content .mobil").hasClass("full"))
			{
				$("#content .mobil").removeClass("full");
			}
			$("#main_content").html(msg);
			
		},
		error: function(XMLHttpRequest, textStatus, errorThrown) {
			alert("Pri spúštani nastala nečakaná chyba.");
			$("#overlay_papagaj").hide();
		}
		});
  }
  function recalculate()
{
	var vyska_all = $('#answer').outerHeight() + $('#SplashNextButton').outerHeight();

	 $('#question div').each(function() {
        vyska_all += $(this).outerHeight();
       
    });
	
	
	var main_vyska = $('#main_content').outerHeight();
	if(vyska_all > main_vyska)
	{
		$('#question').addClass("big");
	}
	else	
	{
		if($('#question').hasClass("big"))
		{
			$('#question').removeClass("big");
		}
	}
}
function isOverflowed(){
	
    $('#slide_content img').each(function() {
        $(this).on('load', recalculate);
    });
		
}
function ShowHelpik(text, cas){
	
	$("#toast-spelovanie-container .toast-title").html(text);
	$("#toast-spelovanie-container").show();
	
	window.setTimeout(function(){$("#toast-spelovanie-container").hide()}, cas);
		
}
function posunDalej($id)
{
	$("#overlay_papagaj").show();
	$('#nextButton').attr("disabled", true);
	$('#prevButton').attr("disabled", true);
	$('#endButton2').attr("disabled", true);
	
	playYes(); 
	var q_val = $("#question_id").val();
	//window.setTimeout(function() {
		$.post( "papagaj.php", { action: "next",q:q_val, slovicko: $id }, function( obj ) {
			$( "#main_content" ).html(obj);	
			
			isOverflowed();
			
		})
		.always(function() {
			$("#overlay_papagaj").hide();
		  });
		
	//}, 200);
}
function posunSpat($id)
{
	$("#overlay_papagaj").show();
	$('#prevButton').attr("disabled", true);
	$('#nextButton').attr("disabled", true);
	playYes(); 
	var q_val = $("#question_id").val();
	//window.setTimeout(function() {
		$.post( "papagaj.php", { action: "prev",q:q_val, slovicko: $id }, function( obj ) {
			$( "#main_content" ).html(obj);	
			
			isOverflowed();
		}).always(function() {
			$("#overlay_papagaj").hide();
		  });
	//}, 200);
}
function ShowSlovicka(button, idecko)
{
	if($(button).hasClass("rotate"))
	{
		$('.slovicka_viac'+idecko).hide();
		$(button).removeClass("rotate");
	}
	else{
		$('.slovicka_viac'+idecko).show();
		$(button).addClass("rotate");
	}
}
function normalizeText(text) {
	return (text || '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ');
}
function playYes() {
    var mp3Array = [
        "/audio/ano3.mp3",
        "/audio/ano4.mp3",
        "/audio/ano5.mp3",
        "/audio/ano6.mp3",
        "/audio/ano7.mp3"
    ];

    var choice = Math.floor(Math.random() * mp3Array.length);
    return playAudio(mp3Array[choice]);
}

function playNo() {
    var mp3Array = [
        "/audio/nienove5.mp3",
        "/audio/nienove4.mp3",
        "/audio/nienove3.mp3",
        "/audio/nienove2.mp3",
        "/audio/nienove1.mp3"
    ];

    var choice = Math.floor(Math.random() * mp3Array.length);
    return playAudio(mp3Array[choice]);
}

function playAudio(src) {
    return new Promise(function(resolve) {
        var audio = document.getElementById('global-audio-player');
        if (!audio || !src) {
            resolve();
            return;
        }

        try {
            audio.pause();
            audio.currentTime = 0;

            if (audio.getAttribute('data-src') !== src) {
                audio.src = src;
                audio.setAttribute('data-src', src);
            }

            var finished = false;

            function done() {
                if (finished) return;
                finished = true;
                audio.removeEventListener('ended', done);
                audio.removeEventListener('error', done);
                resolve();
            }

            audio.addEventListener('ended', done, { once: true });
            audio.addEventListener('error', done, { once: true });

            var playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(function(error) {
                    console.error('Nepodarilo sa prehrať audio:', error);
                    done();
                });
            }
        } catch (error) {
            console.error('Chyba pri prehrávaní:', error);
            resolve();
        }
    });
}

function stopGlobalAudio() {
    var audio = document.getElementById('global-audio-player');
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
}

//@deprecated - postupne nehradit playAudio
function play()
{
	var audio = document.getElementById("audio");
	if(audio)
	{
		var playPromise = audio.play();

		if (playPromise !== undefined) {
			playPromise.then(_ => {
				// Automatic playback started!
				// Show playing UI.
				audio.currentTime = 0
			})
			.catch(error => {
				// Auto-play was prevented
				// Show paused UI.
			});
		}
	}
}
//@deprecated - postupne nehradit playAudio
function playHelp()
{
	var audio_help = document.getElementById("audio_help");
	if(audio_help)
	{
		audio_help.load();
		if (audio_help.paused) {
        
			audio_help.play();
		}else{
			audio_help.currentTime = 0
		}
	}
}
