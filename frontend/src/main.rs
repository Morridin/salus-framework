use yew::prelude::*;

#[component]
fn App() -> Html {
    html! {
        <>
            <h1>{ "Finally - it works!" }</h1>
            <p>{ "This is a showcase program presenting how Yew works." }</p>
        </>
    }
}

fn main() {
    yew::Renderer::<App>::new().render();
}
