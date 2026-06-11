---
layout: doc
---

# Integration with `forgejo` for auth workflows

It is highly likely that your information maganement workflow will not only include publicly available, but also sensitive data. This requires the ability to give specific people/groups specific levels of access to specific data. `shacl-vue` works seamlessly with `forgejo` and [`dumpthings`](./features-dumpthings) to provide such access management capability, as depicted in the figure below.

<div style="text-align:center">
<div style="background:white; display:inline-block; padding:0; width:60%">
    <img src="/forgejo_integration.png" alt="alt">
</div>
</div>

Evidently, `shacl-vue` has the smallest part to play regarding access management in this integrated system. The user only has to enter a `forgejo`-generated token (with use-case specific permissions) into the `Tokens` settings of the `shacl-vue` UI, and then `shacl-vue` will include this token into requests that are made to any configured backends (via the `service_base_url` option). If the user has been given access to data contained in any of the (protected) `dumpthings` collections, said data will be returned and the user will be able to view it in their browser session, while other users without access won't.

For more details about the `dumpthings`-`forgejo` integration, read this [Authentication and authorization](https://hub.psychoinformatics.de/orinoco/dump-things-server#authentication-and-authorization) section.