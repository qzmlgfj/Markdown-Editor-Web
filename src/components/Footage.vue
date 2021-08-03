<template>
    <n-divider />
    <n-p>{{info}}</n-p>
</template>

<script>
import { NDivider, NP } from "naive-ui";
export default {
    name: "Footage",
    components: {
        NDivider,
        NP
    },
    data(){
        return{
            info:"Designed by Ant"
        }
    }
};
</script>

<style scoped>
.n-p{
    text-align: center;
}
</style>
