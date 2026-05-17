hexo.extend.filter.register('theme_inject', function(injects) {
  injects.bodyEnd.raw('statcounter', `
<script type="text/javascript">
var sc_project=12919063;
var sc_invisible=1;
var sc_security="6bfbe963";
</script>
<script type="text/javascript"
src="https://www.statcounter.com/counter/counter.js"
async></script>
<noscript><div class="statcounter"><a title="web stats"
href="https://statcounter.com/" target="_blank"><img
class="statcounter"
src="https://c.statcounter.com/12919063/0/6bfbe963/1/"
alt="web stats"
referrerPolicy="no-referrer-when-downgrade"></a></div></noscript>
  `, {}, {cache: true});
});
