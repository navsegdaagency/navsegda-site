const data=JSON.parse(document.getElementById('estimate-data').textContent);
const dateControl=document.getElementById('event-date');
const formatControl=document.getElementById('meal-format');
const invoiceControl=document.getElementById('invoice');
const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(n)+' ₽';
const status={1:'Ставка аренды, сцена, декор и дополнения требуют подтверждения.',2:'Ставка аренды, сцена, декор и дополнения требуют подтверждения.',3:'Не учтена аренда/депозит; формат меню и дополнения уточняются.',4:'Банкетный пакет: сервис и техника учтены. Даты 25/26, состав пакета, фуршет и декор уточняются.',5:'Только аренда и координатор. Питание, сервис и свет пока не оценены.',6:'От нижней границы аренды. Точная ставка, техника и дополнения не подтверждены.'};
const td=(label,value)=>`<td data-label="${label}">${value}</td>`;
const row=(title,calculation,cost,total=false)=>`<tr class="${total?'cost-total':''}">${td('Статья',title)}${td('Расчёт',calculation)}${td('Стоимость',cost===null?'По запросу':money(cost))}</tr>`;
function render(){
 const day=dateControl.value,format=formatControl.value,invoice=invoiceControl.checked;
 const mealLabel=format==='buffet'?'Фуршет':'Банкет';
 const context=`${day} декабря 2026 · ${mealLabel.toLowerCase()} · ${data.guests} гостей · ${invoice?'оплата по счёту +10%':'без доплаты за оплату по счёту'}`;
 document.getElementById('selected-context').textContent=context;
 document.querySelectorAll('.selected-label').forEach(el=>el.textContent=context);
 const overview=[];
 for(const v of data.variants){
  const rent=v[`rent${day}`],price=v[format],food=price===null?null:price*data.guests,service=food===null||v.service===null?null:Math.round(food*v.service);
  const packagePrice=v[`package${day}`];
  const subtotal=packagePrice!==undefined?packagePrice+data.coordinator:(rent||0)+(food||0)+(service||0)+(v.tech||0)+data.coordinator;
  const organization=Math.round(subtotal*data.organizationRate),base=subtotal+organization,fee=invoice?Math.round(base*data.invoiceRate):0,total=base+fee;
  const title=`${v.id===6?'от ':''}${money(total)}`;
  overview.push(`<tr>${td('Вариант',`<a class="compare-link" href="#variant-${v.id}">${v.label}</a>`)}${td('Оценённая часть',`<strong class="compare-price">${title}</strong>`)}${td('Что уточнить',status[v.id])}</tr>`);
  document.querySelector(`.variant-price[data-id="${v.id}"]`).textContent=title;
  document.querySelector(`.price-scope[data-id="${v.id}"]`).textContent=status[v.id];
  const rentNote=v.id===5?'4 часа; далее +40 000 ₽/час':v.id===6?'Нижняя граница диапазона 400 000–1 000 000 ₽':`${day} декабря; точная ставка уточняется`;
  let rows=row('Аренда / закрытие',rentNote,rent)+row(mealLabel,price===null?'Меню по запросу':`${data.guests} гостей × ${money(price)}`,food)+row('Сервис',v.service===null?'По условиям кейтеринга':`${Math.round(v.service*100)}% от питания`,service)+row('Техника площадки',v.tech===0?'Базовое оснащение в аренде; дополнения отдельно':'По согласуемому комплекту',v.tech)+row('Координатор','1 специалист',data.coordinator)+row('Декор и технические дополнения','Стоимость не согласована',null)+row('Оценено расходов','Без статей без цены',subtotal)+row('Организация',`${Math.round(data.organizationRate*100)}% от оценённых расходов`,organization)+row('С организацией','До доплаты за оплату по счёту',base,true);
  if(packagePrice!==undefined)rows=row('Пакет площадки',`${day} декабря; банкет, сервис и техника`,packagePrice)+row('Фуршет','Применение пакета к фуршету уточняется',null)+row('Координатор','1 специалист',data.coordinator)+row('Декор и дополнения','Стоимость не согласована',null)+row('Оценено расходов','Пакет и координатор',subtotal)+row('Организация','10% от оценённых расходов',organization)+row('С организацией','До доплаты за оплату по счёту',base,true);
  if(invoice)rows+=row('Доплата по счёту','10% от суммы с организацией',fee);
  rows+=row('Оценённая часть к оплате','Неподтверждённые статьи не включены',total,true);
  document.getElementById(`cost-${v.id}`).innerHTML=rows;
 }
 document.getElementById('comparison-rows').innerHTML=overview.join('');
}
[dateControl,formatControl,invoiceControl].forEach(el=>el.addEventListener('change',render));
render();
